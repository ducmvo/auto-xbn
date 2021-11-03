import Web3 from 'web3';
import timer from 'timers/promises';
import countDown from './timer.js';
import { wallets } from './wallets.js';
import {
	getNextClaimTime,
	fetchABI,
	displayRewardStats,
	claimReward,
	getClaimable,
	getBalance
} from './utils.js';

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
	// const DAY_TO_MS = 24 * 60 * 60 * 1000;
	let address, privateKey, prevAddress, nextAddress, nextPrivateKey;
	let reward, nextReward, totalReward, totalClaimableReward;
	let balance, totalBalance;
	let nextDuration = Infinity;
	let time, duration;
	let receipt;

	while (true) {
		nextDuration = Infinity;
		balance = 0;
		totalBalance = 0;
		console.log('==================================\n');
		for (let wallet of wallets) {
			privateKey = wallet.privateKey;
			address = wallet.address;
			time = await getNextClaimTime(contract, address, { nextClaimTime });
			duration = new Date().setTime(time) - new Date();
			balance = await getBalance(
				web3,
				address,
				process.env.XBN_CONTRACT_ADDRESS
			);
			totalBalance += parseFloat(balance);
			console.log(
				'%s\x1b[34m %s\x1b[0m \x1b[33m%s\x1b[0m',
				'ADDRESS: ',
				address.substr(38, 42).toUpperCase(),
				balance
			);
			reward = await displayRewardStats(
				web3,
				contract,
				address,
				{
					getReward,
					getTime
				},
				isStake,
				false
			);

			if (reward !== 0 && duration < nextDuration) {
				//&& duration > -DAY_TO_MS * 7
				nextDuration = duration;
				nextAddress = address;
				nextPrivateKey = privateKey;
				nextReward = reward;
			}
		}

		console.log("\x1b[32m\x1b[1m%s%s\x1b[0m", 'BALANCE: ', totalBalance);

		if (prevAddress && prevAddress === nextAddress)
			throw new Error(`CANNOT CLAIM TWICE FOR ADDRESS: ${nextAddress}`);

		if (!nextReward || nextReward < 0)
			throw Error('Something went wront! Reward cannot be less than 0');
		if (nextReward === 0) {
			console.log('NO MORE REWARD TO CLAIM!');
			return; // No more reward to claim
		}
		// reward > 0
		if (nextDuration <= 0) {
			// Claim reward
			console.log('\nCreating and sending transaction, please wait...\n');
			console.log('ADDRESS: ', nextAddress);
			console.log('REWARD: ', nextReward);
			// Keep reward < 2/3 rewardThreshold

			receipt = await claimReward(
				web3,
				contract,
				contractAddress,
				nextAddress,
				nextPrivateKey,
				{ claim },
				{ RECEIPT_LOG_FILE, TX_LOG_FILE },
				isStake
			);

			await timer.setTimeout(3000);
			// tax = 10% reward
			// if tax < 1 => no tax
			console.log(
				'\x1b[34m%s\x1b[0m',
				`\n${parseFloat(nextReward * 0.9).toFixed(
					4
				)} TAXED REWARD CLAIMED!!\n`
			);
			console.log('TRANSACTION RECEIPT', {
				transactionHash: receipt.transactionHash,
				status: receipt.status
			});

			console.log('\nPlease wait for updating...\n');
			await timer.setTimeout(10000);
		} else {
			// Set Timer to next reward
			totalReward = 0;
			totalClaimableReward = 0;
			for (let wallet of wallets) {
				address = wallet.address;
				reward = await displayRewardStats(
					web3,
					contract,
					wallet.address,
					{
						getReward,
						getTime
					},
					isStake,
					true
				);
				totalReward += reward;
				if (!isStake) {
					totalClaimableReward += getClaimable(reward);
				}
			}
			console.log(
				'\n\x1b[1m%s\x1b[0m\x1b[32m\x1b[1m%s\x1b[0m',
				'TOTAL REWARD: ',
				totalReward
			);
			console.log(
				'\x1b[1m%s\x1b[0m\x1b[32m\x1b[1m%s\x1b[0m',
				'TOTAL CLAIMABLE: ',
				(!isStake && totalClaimableReward) || totalReward * 0.9
			);

			console.log('\nWaiting until next claim...\n');
			console.log(`ADDRESS: ...${nextAddress.substr(38, 42)}`);
			console.log(
				'REWARD: ',
				(isStake && nextReward) || getClaimable(nextReward)
			);

			countDown(nextDuration);
			await timer.setTimeout(nextDuration + 10000);
		}

		prevAddress = nextAddress;
	}
};
