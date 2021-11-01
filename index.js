import Web3 from 'web3';
import timer from 'timers/promises';
import countDown from './timer.js';
import { wallets } from './wallets.js';
import {
	getNextClaimTime,
	fetchABI,
	displayRewardStats,
	claimReward
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
		}
	}
};
