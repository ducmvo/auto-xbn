import delay from 'delay';
import { getTotalBalance, getPrice } from './utils.js';
import { wallets } from './wallets.js';
import notify from './notification.js';
import fs from 'fs';

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
					subject: `${emoji} ${change.toFixed(
						2
					)}% | PRICE ALERT | $${price.toFixed(5)}`,
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

main();
