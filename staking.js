import stakeReward from './claim.js';

const proxyAddress = process.env.STAKING_PROXY_ADDRESS;
const contractAddress = process.env.STAKING_CONTRACT_ADDRESS;

export const params = [
	contractAddress,
	proxyAddress,
	{
		nextClaimTime: 'getNextClaimTime',
		getReward: 'calculateReward',
		getTime: 'getNextClaimTime',
		claim: 'claimXBNReward'
	},
	{
		RECEIPT_LOG_FILE: './logs/receipts.txt',
		TX_LOG_FILE: './logs/transactions.txt',
		ABI_FILE: './logs/abi.txt'
	},
	true
];

const staking = async (params) => {
	const [contractAddress, proxyAddress, methods, files, isStake] = params;
	await stakeReward(contractAddress, proxyAddress, methods, files, isStake);
};

await staking(params);
