import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const cmc = axios.create({
	baseURL: 'https://pro-api.coinmarketcap.com/v1',
	headers: {
		'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY
	}
});

cmc.interceptors.response.use(
	(res) => res.data.data,
	(err) => Promise.reject(err)
);

export const bsc = axios.create({
    baseURL: `https://api.bscscan.com/api/?apikey=${process.env.BSC_API_KEY}`
})

bsc.interceptors.response.use(
	(res) => res.data,
	(err) => Promise.reject(err)
);