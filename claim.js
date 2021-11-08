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
	getBalance,
	calculateFee,
	getPrice
} from './utils.js';
import notify from './notification.js';

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
	let address, privateKey, nextAddress, nextPrivateKey;
	let reward, nextReward, totalReward, totalClaimableReward;
	let balance, totalBalance;
	let nextDuration = Infinity;
	let time, duration;
	let receipt;

	while (true) {
		nextDuration = Infinity;
		balance = 0;
		totalBalance = 0;
		console.log('\n==================================\n');
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

		console.log('\x1b[32m\x1b[1m%s%s\x1b[0m', 'BALANCE: ', totalBalance);

		if (!nextReward || nextReward < 0)
			throw new Error(
				'Something went wront! Reward cannot be less than 0'
			);
		if (nextReward === 0) {
			console.log('NO MORE REWARD TO CLAIM!');
			return; // No more reward to claim
		}
		// reward > 0
		if (nextDuration <= 0) {
			// Claim reward
			console.log('\nCreating and sending transaction, please wait...\n');
			console.log(`ADDRESS: ...${nextAddress.substr(38, 42)}`);
			console.log(
				'REWARD: ',
				(isStake && nextReward) || getClaimable(nextReward)
			);
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
				'\x1b[1m\x1b[32m%s\x1b[0m',
				`\n${parseFloat(
					(isStake && nextReward * 0.9) || getClaimable(nextReward)
				).toFixed(4)} TAXED REWARD CLAIMED!!\n`
			);
			console.log('TRANSACTION RECEIPT', {
				txnHash: `https://bscscan.com/tx/${receipt.transactionHash}`,
				status: receipt.status
			});

			sendMailNotification({
				txnHash: `https://bscscan.com/tx/${receipt.transactionHash}`,
				status: receipt.status,
				reward:
					(isStake && nextReward * 0.9) || getClaimable(nextReward),
				fee: await calculateFee(parseFloat(receipt.gasUsed)),
				XBNprice: (await getPrice(9385)).price
			});

			if (!receipt.status) throw new Error('TRANSACTION FAILED!!');

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

			const counter = countDown(nextDuration);
			await timer.setTimeout(nextDuration);
			clearInterval(counter);
		}
	}
};

const sendMailNotification = (data) => {
	const { reward, txnHash, status, fee, XBNprice } = data;
	const emoji = (status > 0 && '💸  SUCCESS 💸 ') || '🚫 FAILED 🚫';
	const date = new Date();
	const mailOptions = {
		from: process.env.EMAIL,
		to: process.env.EMAIL,
		subject: `${emoji} CLAIMED XBN REWARD | ${reward.toFixed(5)}`,
		html: `<p>
			Time: ${date.toLocaleTimeString()} - ${date.toLocaleDateString()}
			<br />
			Transaction Hash: <a href="${txnHash}" target="_blank">${txnHash}</a>
			<br />
			Status: <span style="color:${status ? 'green' : 'red'};"><strong>${
			status ? 'SUCCESS' : 'FAILED'}</strong></span>
			<br />
			Reward:  ${reward.toFixed(5)} XBN ~ $${(XBNprice * reward).toFixed(2)}
			<br />
			Fee: $${fee}
        </p>
		<p>
			XBN PRICE: $${XBNprice}<br />
		</p>
		`
	};
	notify(mailOptions);
};