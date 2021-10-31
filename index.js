import Web3 from 'web3';
import ethers from 'ethers';
import dotenv from 'dotenv';
import { contractABI, contractAddress } from './abi.js';
dotenv.config();

const wallet = ethers.Wallet.fromMnemonic(process.env.PHRASES_F39E);
const privateKey = wallet.privateKey;
const address = wallet.address;

const bscURL = 'https://bsc-dataseed1.binance.org:443';
const addresses = [
	'0xE3407eb0F4641001CC781BEE5B0bda47a2b76572',
	'0x41d68b76042ecD78034532D910381DdDbf9FCDB2',
	'0xaa388F913484A287e15e8397c50137A160cD8f95',
	'0x2d1eecaC632E386Aab7B733eADFeFC151B88F39E'
];

const main = async () => {
	const web3 = new Web3(bscURL);
	const address = addresses[0];
	const contract = new web3.eth.Contract(contractABI, contractAddress, {
		from: address
	});

	// await displayRewardStats(web3, contract, addresses);
	try {
		await claimReward(web3, contract);
	} catch (e) {
		console.log(e);
	}
};

const displayRewardStats = async (web3, contract, addresses) => {
	let totalReward = 0;
	let reward, nextClaimTime, claimDate;
	for (let address of addresses) {
		console.log('\n===========================');
		console.log(
			'ADDRESS: ',
			address.substr(address.length - 4, address.length)
		);
		reward = await contract.methods.calculateReward(address).call();
		nextClaimTime = await contract.methods.getNextClaimTime(address).call();
		claimDate = new Date(parseInt(nextClaimTime) * 1000);
		totalReward += parseFloat(web3.utils.fromWei(reward, 'ether'));
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
		const days = diffTime / (24 * 60 * 60 * 1000.0);
		const hours = (days % 1) * 24;
		const mins = (hours % 1) * 60;

		console.log(
			`${days.toFixed(0)} days, ${hours.toFixed(0)} hours, ${mins.toFixed(
				0
			)} mins left to claim reward!`
		);
	}
	console.log('\nTOTAL REWARD: ', totalReward);
};

const claimReward = async (web3, contract) => {
	const encodedABI = await contract.methods.claimXBNReward().encodeABI();
	const tx = {
		from: address,
		to: contractAddress,
		gas: 200000,
		data: encodedABI
	};
	const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
	console.log('SIGNED TX', signedTx);

	const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
	console.log('RECEIPT', receipt);
};

main();
