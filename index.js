import Web3 from 'web3';
import timer from 'timers/promises';
import countDown from './timer.js';
import { wallets } from './wallets.js';
import {
	getNextClaimTime,
	fetchABI,
	displayRewardStats,
	claimReward,
	getClaimable
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
	const DAY_TO_MS = 24 * 60 * 60 * 1000;
	let address, privateKey, prevAddress, nextAddress, nextPrivateKey;
	let reward, nextReward, totalReward, totalClaimableReward;
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
				nextReward = await displayRewardStats(
					web3,
					contract,
					nextAddress,
					{
						getReward,
						getTime
					},
					isStake,
					false
				);
			}
		}

		if (nextReward !== 0 && nextDuration <= 0) {
			// claimable within 7 days
			if (nextAddress && prevAddress === nextAddress)
				throw new Error(
					`CANNOT CLAIM TWICE FOR ADDRESS: ${nextAddress}`
				);

			console.log('\nCreating and sending transaction, please wait...\n');
			console.log('ADDRESS: ', nextAddress);
			console.log('REWARD: ', nextReward);

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

			console.log(
				'\x1b[34m%s\x1b[0m',
				`Congrats!! You have successfully claimed ${parseFloat(
					nextReward
				).toFixed(2)} REWARD!!!`
			);
			console.log('RECEIPT', receipt);
			prevAddress = nextAddress;

			console.log('\nPlease wait for updating...\n');
			await timer.setTimeout(10000);
		} else {
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
			console.log('\n\x1b[34m%s\x1b[32m', 'TOTAL REWARD: ', totalReward);
			console.log(
				'\x1b[34m%s\x1b[32m',
				'TOTAL CLAIMABLE: ',
				(!isStake && totalClaimableReward) || totalReward
			);

			console.log('\nWaiting until next claim...\n');
			console.log('ADDRESS: ', nextAddress);
			console.log('REWARD: ', nextReward);
			countDown(nextDuration + 9000);
			await timer.setTimeout(nextDuration + 10000);
		}
	}
};
