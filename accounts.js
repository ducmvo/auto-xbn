import web3 from 'web3';
import delay from 'delay';
import fs from 'fs';
import { cmc, bsc } from './axios.js';
import { wallets } from './wallets.js';

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

const getTotalBalance = async (addresses, symbolID, isUp) => {
	console.log('\n\n==================================');
	const { price, contract, time } = await getPrice(symbolID);
	const balance = await getTokenBalance(addresses, contract);
	console.log(
		'TIME: ',
		new Date(time).toLocaleTimeString() +
			' - ' +
			new Date(time).toLocaleDateString()
	);

	console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
	console.log("%s\x1b[34m\x1b[1m%s\x1b[0m", 'BALANCE: ', balance);
	console.log(`%s\x1b[${isUp&&32||31}m\x1b[1m%s\x1b[0m`, 'PRICE: ', price);
	console.log("%s\x1b[34m\x1b[1m%s\x1b[0m", 'USD: ', price * balance);
	console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
	return { price, balance, time };
};

const main = async () => {
	const addresses = wallets.map((wallet) => wallet.address);
	const symbolID = 9385; //XBN
	const ACCOUNT_DATA_FILE = './logs/accounts-data.txt';
	let price, balance, time, chunk;
	let prevPrice;
	let isUp = false;
	while (true) {
		price, balance, time = await getTotalBalance(addresses, symbolID, isUp);
		if (prevPrice && price > prevPrice ) isUp = true;
		else isUp = false;
		chunk = {
			price: price,
			balance: balance,
			time: time
		};
		fs.appendFileSync(ACCOUNT_DATA_FILE, JSON.stringify(chunk));
		prevPrice = price;
		await delay(5 * 60 * 1000);
	}
};

main();