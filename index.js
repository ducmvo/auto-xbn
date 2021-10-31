import Web3 from 'web3';
import delay from 'delay';
import fs from 'fs';
import { bsc } from './axios.js';
import {
	contractAddress,
	proxyAddress,
	address,
	privateKey,
	addresses
} from './wallet.js';

const bscURL = 'https://bsc-dataseed1.binance.org:443';

const main = async () => {
	const web3 = new Web3(bscURL);
	const contractABI = await fetchABI(proxyAddress);
	const contract = new web3.eth.Contract(contractABI, contractAddress);
	let totalReward = 0;
	let nextAddress, nextReward;
	let nextDuration = Infinity;
	let time, duration;

	while (true) {
		for (let address of addresses) {
			time = await getNextClaimTime(contract, address);
			duration = new Date().setTime(time) - new Date();
			console.log(
				'ADDRESS: ',
				address.substr(address.length - 4, address.length),
				duration
			);
			if (duration < nextDuration) {
				nextDuration = duration;
				nextAddress = address;
			}
		}
		nextReward = await displayRewardStats(web3, contract, nextAddress);
		if (nextDuration <= 0) {
			console.log('Claiming reward!!');
			await claimReward(web3, contract, nextAddress);
		} else {
			for (let address of addresses) {
				totalReward += await displayRewardStats(
					web3,
					contract,
					address
				);
			}
			console.log('\n\x1b[36m%s\x1b[32m', 'TOTAL REWARD: ', totalReward);
			console.log();
			console.log('Waiting until next claim...');
			console.log('ADDRESS: ', nextAddress);
			console.log('DURATION: ', nextDuration, 'ms');
			console.log('REWARD: ', nextReward);
			await delay(nextDuration);
		}
	}
};

const getNextClaimTime = async (contract, address) => {
	const nextClaimTime = await contract.methods
		.getNextClaimTime(address)
		.call();
	return parseInt(nextClaimTime) * 1000;
};

const fetchABI = async (address) => {
	let abi, data;
	const ABI_FILE = './logs/abi.txt';

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
	reward = await contract.methods.calculateReward(address).call();
	nextClaimTime = await contract.methods.getNextClaimTime(address).call();
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

	console.log(
		`${days - (days % 1)} days, ${hours - (hours % 1)} hours, ${
			mins - (mins % 1)
		} mins left to claim reward!`
	);

	return parseFloat(web3.utils.fromWei(reward, 'ether'));
};

const claimReward = async (web3, contract, address) => {
	const encodedABI = await contract.methods.claimXBNReward().encodeABI();
	const RECEIPT_LOG_FILE = './logs/receipts.txt';
	const TX_LOG_FILE = './logs/transactions.txt';
	let tx, signedTx, receipt;

	tx = {
		from: address,
		to: contractAddress,
		gas: 200000,
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

main();
