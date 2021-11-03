const startTimer = (duration) => {
	duration = duration / 1000;
	let days, hours, mins, secs;
	const timer = () => {
		duration = duration - 1;
		days = duration / (24 * 60 * 60);
		hours = (days % 1) * 24;
		mins = (hours % 1) * 60;
		secs = (mins % 1) * 60;

		days -= days % 1;
		hours -= hours % 1;
		mins -= mins % 1;
		secs -= secs % 1;

		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(
				(days && `${days} days, ` || "") +
				(hours && `${hours} hours, ` || "") +
				(mins && `${mins} mins, ` || "") +
				(secs && `${secs} secs.`)
		);
		if (duration <= 0) {
			clearInterval(counter);
			console.log('\nCountdown ended, please wait....\n');
			return;
		}
	};
	const counter = setInterval(timer, 1000);
};

export default startTimer;