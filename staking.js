import stake from './index.js';

const proxyAddress = '0x18932c68f664ac348aed3c0b07e2ad2124d0f32c';
const contractAddress = '0x8AB58dd7aC92Ee5088a34556bED11Be7B74B2ab0';

stake(
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
	}
);
