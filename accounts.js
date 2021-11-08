import Web3 from 'web3';
import delay from 'delay';
import fs from 'fs';
import { cmc, bsc } from './axios.js';
import { wallets } from './wallets.js';
import notify from './notification.js';
import { fetchABI } from './utils.js';

const getURL = (address, contract) => {
	const url =
		`&module=account` +
		`&action=tokenbalance` +
		`&contractaddress=${contract}` +
		`&address=${address}` +
		`&tag=latest`;
	return url;
};

const getTokenBalance = async (addresses, contract) => {
	let total = 0;
	for (let address of addresses) {
		const url = getURL(address, contract);
		const data = await bsc.get(url);
		const result = parseFloat(Web3.utils.fromWei(data.result, 'ether'));
		total += result;
		console.log(address.substr(address.length - 4, address.length), result);
	}
	return total;
};

const getPrice = async (symbolID) => {
	const result = await cmc.get(
		`/cryptocurrency/quotes/latest?id=${symbolID}`
	);
	const contract = result[symbolID].platform.token_address;
	const price = result[symbolID].quote.USD.price;
	const time = result[symbolID].quote.USD.last_updated;
	const data = { price, contract, time };
	return data;
};

const getTotalBalance = async (addresses, symbolID, openPrice) => {
	console.log('==================================');
	const { price, contract, time } = await getPrice(symbolID);

	const change = (price / openPrice - 1) * 100;
	const balance = await getTokenBalance(addresses, contract);
	console.log(
		'TIME: ',
		new Date(time).toLocaleTimeString() +
			' - ' +
			new Date(time).toLocaleDateString()
	);
	console.log(' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	console.log(
		'| %s\x1b[37m\x1b[1m%s\x1b[0m | %s\x1b[37m\x1b[1m%s\x1b[0m  |',
		'OPEN:  ',
		openPrice.toFixed(6),
		'BALANCE: ',
		balance.toFixed(0)
	);
	console.log(
		`| %s\x1b[${
			(change >= 0 && 32) || 31
		}m\x1b[1m%s\x1b[0m | %s\x1b[33m\x1b[1m$%s\x1b[0m |`,
		'PRICE: ',
		price.toFixed(6),
		'USD:  ',
		(price * balance).toFixed(2)
	);
	console.log(' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	console.log(
		`%s\x1b[${(change >= 0 && 32) || 31}m\x1b[1m%s% | %s \x1b[0m`,
		`${change >= 0 ? '🚀 ' : '🚨 '}`,
		change ? change.toFixed(2) : 0,
		`${(price - openPrice).toFixed(6)}`
	);

	return { price, balance, time, change };
};

const main = async () => {
	const addresses = wallets.map((wallet) => wallet.address);
	const symbolID = 9385; //XBN
	const ACCOUNT_DATA_FILE = './logs/accounts-data.txt';
	const ONEDAY = 24 * 60 * 60 * 1000;

	let openPrice, count, chunk;
	let currTime, nextTime;
	while (true) {
		openPrice = await getPrice(symbolID);
		openPrice = openPrice.price;
		count = 1;

		currTime = new Date().getTime();
		nextTime = currTime + ONEDAY;
		while (currTime <= nextTime) {
			currTime = new Date().getTime();
			console.log('\nCHECK PRICE COUNT: ', count);
			const { price, balance, time, change } = await getTotalBalance(
				addresses,
				symbolID,
				openPrice
			);

			if (openPrice && Math.abs(change) >= 10) {
				// Send email notification if change > 10%
				const emoji = (change > 0 && '🚀 UP 🚀') || '🚨 DOWN 🚨';
				const date = new Date();
				const mailOptions = {
					from: process.env.EMAIL,
					to: process.env.EMAIL,
					subject: `${emoji} ${change.toFixed(2)}% | PRICE ALERT | $${price.toFixed(5)}`,
					html: `<p>
					Time:&nbsp;${date.toLocaleTimeString()} - ${date.toLocaleDateString()}
					<br />
					Price:&nbsp;<span style="font-size:20px;color:${
						change >= 0 ? 'green' : 'red'
					};"><strong>${price}</strong></span>
					</p>`
				};
				notify(mailOptions);
			}

			chunk = {
				price: price,
				balance: balance,
				time: time
			};
			fs.appendFileSync(ACCOUNT_DATA_FILE, JSON.stringify(chunk));
			count++;
			await delay(5 * 60 * 1000);
		}
	}
};

// Get Address Token Balance with Contract ABI
export const getXBNBalance = async (address) => {
	const ABI_FILE = 'logs/xbn-abi.txt';
	const proxyAddress = process.env.XBN_PROXY_ADDRESS;
	const contractAddress = process.env.XBN_CONTRACT_ADDRESS;
	const web3 = new Web3(process.env.PROVIDER);
	const contractABI = await fetchABI(proxyAddress, { ABI_FILE });
	const contract = new web3.eth.Contract(contractABI, contractAddress);

	const balance = await contract.methods.balanceOf(address).call();

	return web3.utils.fromWei(balance, 'ether');
};

main();
