import Web3 from 'web3';
import ethers from 'ethers';
import delay from 'delay';
import fs from 'fs';
import { bsc } from './axios.js';

const mnemonicPhrases = [
	process.env.PHRASES_6572,
	process.env.PHRASES_F95,
	process.env.PHRASES_F39E,
	process.env.PHRASES_CDB2
];

const proxyAddress = '0x1CA3a59a426E4f735548fCa84132CF69E7FD7e94';
export const contractAddress = '0x77C6BB15eac53C710964b19911A59DA473412847';

const wallets = mnemonicPhrases.map((phrase) =>
	ethers.Wallet.fromMnemonic(phrase)
);

const bscURL = 'https://bsc-dataseed1.binance.org:443';

const main = async () => {
	const web3 = new Web3(bscURL);
	const contractABI = await fetchABI(proxyAddress);
	const contract = new web3.eth.Contract(contractABI, contractAddress);
	const DAY_TO_MS = 24 * 60 * 60 * 1000;
	let address, privateKey, prevAddress, nextAddress, nextPrivateKey;
	let nextReward, totalReward;
	let nextDuration = Infinity;
	let time, duration;
	let receipt;

	while (true) {
		nextDuration = Infinity;
		console.log('==========================');
		for (let wallet of wallets) {
			privateKey = wallet.privateKey;
			address = wallet.address;

			time = await getNextClaimTime(contract, address);
			duration = new Date().setTime(time) - new Date();
			console.log(
				'ADDRESS: ',
				address.substr(address.length - 4, address.length),
				duration
			);
			if (duration < nextDuration && duration > -DAY_TO_MS) {
				nextDuration = duration;
				nextAddress = address;
				nextPrivateKey = privateKey;
			}
		}

		if (nextDuration <= 0 && nextDuration > -DAY_TO_MS) {
            if (nextAddress && prevAddress === nextAddress)
			    throw new Error(`CANNOT CLAIM TWICE FOR ADDRESS: ${nextAddress}`);
			nextReward = await displayRewardStats(web3, contract, nextAddress);
			console.log('\nCreating and sending transaction, please wait...\n');
			receipt = await claimReward(
				web3,
				contract,
				nextAddress,
				nextPrivateKey
			);
			console.log(
				'\x1b[34m%s\x1b[0m',
				`Congrats!! You have successfully claimed ${parseFloat(
					nextReward
				).toFixed(2)} REWARD!!!`
			);
			console.log('RECEIPT', receipt);

			prevAddress = nextAddress;
		} else {
            totalReward = 0;
			for (let wallet of wallets) {
				address = wallet.address;
				totalReward += await displayRewardStats(
					web3,
					contract,
					address
				);
			}
			console.log('\n\x1b[36m%s\x1b[32m', 'TOTAL REWARD: ', totalReward);
			console.log();
			console.log('Waiting until next claim...');
            nextReward = await displayRewardStats(web3, contract, nextAddress);
			if (nextDuration < 0)
				throw new Error(
					'Something went wrong, Reward avaiable but unable to claim'
				);
            
			await delay(nextDuration + 10000);
		}
	}
};

const getNextClaimTime = async (contract, address) => {
	const nextClaimTime = await contract.methods.nextClaimTime(address).call();
	return parseInt(nextClaimTime) * 1000;
};

const fetchABI = async (address) => {
	let abi, data;
	const ABI_FILE = './logs/migration-abi.txt';

	console.log('Fetching Contract ABI...');

	try {
		data = fs.readFileSync(ABI_FILE, 'utf8');
		if (!data) throw new Error('Empty File');
		abi = JSON.parse(data);
	} catch (err) {
		data = await bsc.get(
			`&module=contract&action=getabi&address=${address}`
		);
		if (err.message === 'Empty File')
			fs.writeFileSync(ABI_FILE, data.result);
		else {
			const file = fs.createWriteStream(ABI_FILE, { flag: 'a' });
			file.write(data.result);
			file.end();
		}
		abi = JSON.parse(data.result);
	}
	return abi;
};

const displayRewardStats = async (web3, contract, address) => {
	let reward, nextClaimTime, claimDate;
	console.log('\n===========================');
	console.log(
		'ADDRESS: ',
		address.substr(address.length - 4, address.length)
	);
	reward = await contract.methods.getBonus(address).call();
	nextClaimTime = await contract.methods.nextClaimTime(address).call();
	claimDate = new Date(parseInt(nextClaimTime) * 1000);

	console.log(
		'calculateReward: ',
		parseFloat(web3.utils.fromWei(reward, 'ether'))
	);
	console.log(
		'getNextClaimTime: ',
		claimDate.toLocaleDateString(),
		claimDate.toLocaleTimeString()
	);
	const date = new Date();
	date.setTime(parseInt(nextClaimTime) * 1000);
	const diffTime = Math.abs(new Date() - date);
	const days = diffTime / (24 * 60 * 60 * 1000);
	const hours = (days % 1) * 24;
	const mins = (hours % 1) * 60;

	if (date - new Date() > 0) {
		console.log(
			`${days - (days % 1)} days, ${hours - (hours % 1)} hours, ${
				mins - (mins % 1)
			} mins left to claim reward!`
		);
	} else {
		console.log('Reward is READY to be claimed!!');
	}

	return parseFloat(web3.utils.fromWei(reward, 'ether'));
};

const claimReward = async (web3, contract, address, privateKey) => {
	const encodedABI = await contract.methods.claimBonus().encodeABI();
	const RECEIPT_LOG_FILE = './logs/migration-receipts.txt';
	const TX_LOG_FILE = './logs/migration-transactions.txt';
	let tx, signedTx, receipt;

	tx = {
		from: address,
		to: contractAddress,
		gas: 370000,
		data: encodedABI
	};
	signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
	receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
	fs.appendFileSync(TX_LOG_FILE, JSON.stringify(signedTx) + '\n');
	fs.appendFileSync(RECEIPT_LOG_FILE, JSON.stringify(receipt) + '\n');
	return receipt;
};

main();
