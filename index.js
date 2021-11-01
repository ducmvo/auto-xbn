import Web3 from 'web3';
import countDown from './timer.js';
import timer from 'timers/promises';
import fs from 'fs';
import { bsc } from './axios.js';
import { wallets } from './wallets.js';

export default async (
	contractAddress,
	proxyAddress,
	methods,
	files,
	isStake = true
) => {
	const { nextClaimTime, getReward, getTime, claim } = methods;
	const { RECEIPT_LOG_FILE, TX_LOG_FILE, ABI_FILE } = files;

	const web3 = new Web3(process.env.PROVIDER);
	const contractABI = await fetchABI(proxyAddress, { ABI_FILE });
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
			time = await getNextClaimTime(contract, address, { nextClaimTime });
			duration = new Date().setTime(time) - new Date();
			console.log(
				'ADDRESS: ',
				address.substr(address.length - 4, address.length),
				duration
			);
			if (duration < nextDuration && duration > -DAY_TO_MS * 7) {
				nextDuration = duration;
				nextAddress = address;
				nextPrivateKey = privateKey;
			}
		}

		if (nextDuration <= 0 && nextDuration > -DAY_TO_MS * 7) {
			if (nextAddress && prevAddress === nextAddress)
				throw new Error(
					`CANNOT CLAIM TWICE FOR ADDRESS: ${nextAddress}`
				);
			nextReward = await displayRewardStats(web3, contract, nextAddress, {
				getReward,
				getTime
			});
			console.log('\nCreating and sending transaction, please wait...\n');
			receipt = await claimReward(
				web3,
				contract,
				contractAddress,
				nextAddress,
				nextPrivateKey,
				{ claim },
				{ RECEIPT_LOG_FILE, TX_LOG_FILE }
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
					wallet.address,
					{
						getReward,
						getTime
					}
				);
			}
			console.log('\n\x1b[36m%s\x1b[32m', 'TOTAL REWARD: ', totalReward);
			console.log();
			console.log('Waiting until next claim...');
			nextReward = await displayRewardStats(
				web3,
				contract,
				nextAddress,
				{
					getReward,
					getTime
				},
				isStake
			);
			if (nextDuration < 0)
				throw new Error(
					'Something went wrong, Reward avaiable but unable to claim'
				);
			countDown(nextDuration + 9000);
			await timer.setTimeout(duration + 10000);
			// await delay(nextDuration + 10000);
		}
	}
};

const getNextClaimTime = async (contract, address, methods) => {
	const { nextClaimTime } = methods;
	const duration = await contract.methods[nextClaimTime](address).call();
	return parseInt(duration) * 1000;
};

export const fetchABI = async (address, files) => {
	const { ABI_FILE } = files;
	let abi, data;
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

export const displayRewardStats = async (
	web3,
	contract,
	address,
	methods,
	isStake = true
) => {
	let reward, nextClaimTime, claimDate;
	const { getReward, getTime } = methods;
	console.log('\n===========================');
	console.log(
		'ADDRESS: ',
		address.substr(address.length - 4, address.length)
	);

	reward = await contract.methods[getReward](address).call();
	reward = parseFloat(web3.utils.fromWei(reward, 'ether'));
	if (!isStake) {
		if (reward > 300) {
			reward /= 6; // 300 XBN , claim 17%
		} else if (reward > 30) {
			reward /= 3; // claim 33%
		} else if (reward > 10) {
			reward /= 2; // claim 50%
		}  // reward <= 10 claim 100%
	}

	nextClaimTime = await contract.methods[getTime](address).call();
	claimDate = new Date(parseInt(nextClaimTime) * 1000);

	console.log('calculateReward: ', reward);
	console.log(
		'getNextClaimTime: ',
		claimDate.toLocaleDateString(),
		claimDate.toLocaleTimeString()
	);
	const date = new Date();
	date.setTime(parseInt(nextClaimTime) * 1000);
	const duration = Math.abs(new Date() - date);
	const days = duration / (24 * 60 * 60 * 1000);
	const hours = (days % 1) * 24;
	const mins = (hours % 1) * 60;

	if (date - new Date() > 0) {
		console.log(
			`${days - (days % 1)} days, ${hours - (hours % 1)} hours, ${
				mins - (mins % 1)
			} mins left to claim reward!`
		);
	} else if (reward !== 0) {
		console.log('Reward is READY to be claimed!!');
	} else {
		console.log('No reward balance on this address');
	}

	return reward;
};

export const claimReward = async (
	web3,
	contract,
	contractAddress,
	address,
	privateKey,
	methods,
	files
) => {
	const { claim } = methods;
	const { RECEIPT_LOG_FILE, TX_LOG_FILE } = files;
	const encodedABI = await contract.methods[claim]().encodeABI();
	let tx, signedTx, receipt;

	tx = {
		from: address,
		to: contractAddress,
		gas: 500000,
		value: web3.utils.toWei('0.003', 'ether'),
		data: encodedABI
	};
	// signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
	// receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
	signedTx = tx;
	receipt = tx;
	fs.appendFileSync(TX_LOG_FILE, JSON.stringify(signedTx) + '\n');
	fs.appendFileSync(RECEIPT_LOG_FILE, JSON.stringify(receipt) + '\n');
};
