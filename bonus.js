import claimBonus from './index.js';

const proxyAddress = '0x1CA3a59a426E4f735548fCa84132CF69E7FD7e94';
const contractAddress = '0x77C6BB15eac53C710964b19911A59DA473412847';

claimBonus(
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
);
