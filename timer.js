export default (duration) => {
	duration = duration / 1000;
	let days, hours, mins, secs;
	const timer = () => {
		duration = duration - 1;
		days = duration / (24 * 60 * 60);
		hours = (days % 1) * 24;
		mins = (hours % 1) * 60;
		secs = (mins % 1) * 60;
		process.stdout.clearLine(); 
		process.stdout.cursorTo(0);
		process.stdout.write(
			`${days - (days % 1)} days, ` +
				`${hours - (hours % 1)} hours, ` +
				`${mins - (mins % 1)} mins,  ` +
				`${secs - (secs % 1)} secs. `
		);

		if (duration <= 0) {
			clearInterval(counter);
			return;
		}
	};
	const counter = setInterval(timer, 1000);
};