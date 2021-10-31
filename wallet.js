import ethers from 'ethers';
import dotenv from 'dotenv';
dotenv.config();


export const contractAddress = '0x8AB58dd7aC92Ee5088a34556bED11Be7B74B2ab0';
export const proxyAddress = '0x18932c68f664ac348aed3c0b07e2ad2124d0f32c'
const wallet = ethers.Wallet.fromMnemonic(process.env.PHRASES_F39E);
export const privateKey = wallet.privateKey;
export const address = wallet.address;
export const addresses = [
	'0xE3407eb0F4641001CC781BEE5B0bda47a2b76572',
	'0x41d68b76042ecD78034532D910381DdDbf9FCDB2',
	'0xaa388F913484A287e15e8397c50137A160cD8f95',
	'0x2d1eecaC632E386Aab7B733eADFeFC151B88F39E'
];