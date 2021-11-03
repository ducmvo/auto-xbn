import { bsc } from './axios.js';
import fs from 'fs';

export const getNextClaimTime = async (contract, address, methods) => {
	const { nextClaimTime } = methods;
	const duration = await contract.methods[nextClaimTime](address).call();
	return parseInt(duration) * 1000;
};

export const getNextReward = async (contract, address, methods) => {
	const { getReward } = methods;
	return await contract.methods[getReward](address).call();
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
	let nextClaimTime, claimDate, duration;
	let reward = await getNextReward(contract, address, {
		getReward: getReward
	});
	reward = parseFloat(web3.utils.fromWei(reward, 'ether'));

	if (!display) return reward;

	console.log('\n===========================');
	console.log(
		'%s\x1b[34m%s\x1b[0m',
		'ADDRESS: ',
		address.substr(address.length - 4, address.length).toUpperCase()
	);

	console.log('CALCULATED REWARD: ', reward);
	!isStake && console.log('CLAIMABLE: ', getClaimable(reward));

	if (reward !== 0) {
		nextClaimTime = await getNextClaimTime(contract, address, {
			nextClaimTime: getTime
		});
		duration = new Date().setTime(nextClaimTime) - new Date();
		claimDate = new Date(nextClaimTime);

		console.log(
			'NEXT CLAIM TIME: ',
			claimDate.toLocaleDateString(),
			claimDate.toLocaleTimeString()
		);
		const dr = displayDuration(duration);
		duration > 0
			? console.log(`REWARD READY IN: ${dr}`)
			: console.log('REWARD IS READY!!!');
	} else {
		console.log('NO REWARD IN THIS ADDRESS.');
	}

	return reward;
};

export const displayDuration = (milliseconds) => {
	let days = milliseconds / (24 * 60 * 60 * 1000);
	let hours = (days % 1) * 24;
	let mins = (hours % 1) * 60;
	let secs = (mins % 1) * 60;
	days -= days % 1;
	hours -= hours % 1;
	mins -= mins % 1;
	secs -= secs % 1;
	return (
		((days && `${days} days, `) || '') +
		((hours && `${hours} hours, `) || '') +
		((mins && `${mins} mins, `) || '') +
		((secs && `${secs} secs.`) || '')
	);
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

export const getBalance = async (web3, address, contractAddress) => {
	const url =
		`&module=account` +
		`&action=tokenbalance` +
		`&contractaddress=${contractAddress}` +
		`&address=${address}` +
		`&tag=latest`;

	const data = await bsc.get(url);
	const result = web3.utils.fromWei(data.result, 'ether');
	return result;
};
