import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL,
		pass: process.env.PASSWORD
	}
});

const notify = (price, change) => {
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

	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log(error);
		} else {
			console.log('Notification Email Sent: ' + info.response);
		}
	});
};

export default notify;
