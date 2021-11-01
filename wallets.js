import ethers from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const mnemonicPhrases = [
	process.env.PHRASES_6572,
	process.env.PHRASES_F95,
	process.env.PHRASES_F39E,
	process.env.PHRASES_CDB2
];

export const wallets = mnemonicPhrases.map((phrase) =>
	ethers.Wallet.fromMnemonic(phrase)
);