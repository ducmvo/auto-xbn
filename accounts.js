import web3 from 'web3';
import delay from 'delay';
import fs from 'fs';
import { cmc, bsc } from './axios.js';
import { wallets } from './wallets.js';
import notify from './notification.js';

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
		const result = parseFloat(web3.utils.fromWei(data.result, 'ether'));
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
	console.log('\n\n==================================');
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
		balance.toFixed(0),
	);
	console.log(
		`| %s\x1b[${(change >= 0 && 32) || 31}m\x1b[1m%s\x1b[0m | %s\x1b[33m\x1b[1m$%s\x1b[0m |`,
		'PRICE: ',
		price.toFixed(6),
		'USD:  ',
		(price * balance).toFixed(2)
	);
	console.log(' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	console.log(
		`%s\x1b[${(change >= 0 && 32) || 31}m\x1b[1m%s%\x1b[0m`,
		`${change >= 0 ? '🚀 ' : '🚨 '}`,
		change ? change.toFixed(2) : 0
	);
	return { price, balance, time, change };
};

const main = async () => {
	const addresses = wallets.map((wallet) => wallet.address);
	const symbolID = 9385; //XBN
	const ACCOUNT_DATA_FILE = './logs/accounts-data.txt';

	let openPrice, count, chunk;

	while (true) {
		openPrice = await getPrice(symbolID);
		openPrice = openPrice.price;
		count = (24 * 60) / 5; // 1 day to 5 mins count
		while (count !== 0) {
			const { price, balance, time, change } = await getTotalBalance(
				addresses,
				symbolID,
				openPrice
			);

			if (openPrice && Math.abs(change) >= 10) {
				// Send email notification if change > 10%
				notify(price, change);
			}

			chunk = {
				price: price,
				balance: balance,
				time: time
			};
			fs.appendFileSync(ACCOUNT_DATA_FILE, JSON.stringify(chunk));
			count--;
			await delay(5 * 60 * 1000);
		}
	}
};

main();
