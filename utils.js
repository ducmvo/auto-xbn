import { bsc } from './axios.js';
import fs from 'fs';

export const getNextClaimTime = async (contract, address, methods) => {
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
		} // reward <= 10 claim 100%
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
