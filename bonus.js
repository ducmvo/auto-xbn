import claimBonus from './index.js';

const proxyAddress = process.env.BONUS_PROXY_ADDRESS;
const contractAddress = process.env.BONUS_CONTRACT_ADDRESS;

export const params = [
	contractAddress,
	proxyAddress,
	{
		nextClaimTime: 'nextClaimTime',
		getReward: 'getBonus',
		getTime: 'nextClaimTime',
		claim: 'claimBonus'
	},
	{
		RECEIPT_LOG_FILE: './logs/migration-receipts.txt',
		TX_LOG_FILE: './logs/migration-transactions.txt',
		ABI_FILE: './logs/migration-abi.txt'
	},
	false // not staking
];

const claimReward = (params) => {
	const [contractAddress, proxyAddress, methods, files, isStake] = params;
	claimBonus(contractAddress, proxyAddress, methods, files, isStake);
};

claimReward(params);
