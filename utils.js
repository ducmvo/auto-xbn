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
	isStake = true,
	display = true
) => {
	const { getReward, getTime } = methods;
	let reward, nextClaimTime, claimDate, duration, days, hours, mins;
	display && console.log('\n===========================');
	display &&
		console.log(
			'%s\x1b[30m\x1b[43m%s\x1b[0m',
			'ADDRESS: ',
			address.substr(address.length - 4, address.length).toUpperCase()
		);

	reward = await contract.methods[getReward](address).call();
	reward = parseFloat(web3.utils.fromWei(reward, 'ether'));

	nextClaimTime = await contract.methods[getTime](address).call();
	claimDate = new Date(parseInt(nextClaimTime) * 1000);

	display && console.log('CALCULATED REWARD: ', reward);
	if (!isStake) {
		display && console.log('CLAIMABLE: ', getClaimable(reward));
	}
	display &&
		console.log(
			'NEXT CLAIM TIME: ',
			claimDate.toLocaleDateString(),
			claimDate.toLocaleTimeString()
		);
	duration = claimDate - new Date();

	if (duration > 0) {
		days = duration / (24 * 60 * 60 * 1000);
		hours = (days % 1) * 24;
		mins = (hours % 1) * 60;
		display &&
			console.log(
				`${days - (days % 1)} days, ${hours - (hours % 1)} hours, ${
					mins - (mins % 1)
				} mins left to claim reward!`
			);
	} else if (reward !== 0) {
		display && console.log('Reward is READY to be claimed!!');
	} else {
		display && console.log('No reward balance on this address');
	}
	return reward;
};

export const getClaimable = (reward) => {
	if (reward > 300) {
		return reward / 6; // 300 XBN , claim 17%
	} else if (reward > 30) {
		return reward / 3; // claim 33%
	} else if (reward > 10) {
		return reward / 2; // claim 50%
	} else {
		return reward; // reward <= 10 claim 100%
	}
};

export const claimReward = async (
	web3,
	contract,
	contractAddress,
	address,
	privateKey,
	methods,
	files,
	isStake
) => {
	const { claim } = methods;
	const { RECEIPT_LOG_FILE, TX_LOG_FILE } = files;
	const encodedABI = await contract.methods[claim]().encodeABI();
	let tx, signedTx, receipt;
	tx = {
		from: address,
		to: contractAddress,
		data: encodedABI,
		gas: 370000
	};
	if (isStake) {
		tx = { ...tx, gas: 500000, value: web3.utils.toWei('0.003', 'ether') };
	}
	signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
	receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
	fs.appendFileSync(TX_LOG_FILE, JSON.stringify(signedTx) + '\n');
	fs.appendFileSync(RECEIPT_LOG_FILE, JSON.stringify(receipt) + '\n');
	return receipt;
};
