import { detect } from 'detect-browser';

export const fetchUserAgentName = () => {
	const browser = detect();
	const browserVersion = parseInt(browser.version, 10);
	let browserName = browser.name;
	const osName = browser.os.split(' ')[0];

	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		return `ZimbraXDesktopClient - (${osName})`;
	}

	const mapping = {
		chrome: 'GC',
		firefox: 'FF',
		edge: 'EDGE',
		safari: 'SAF',
		opera: 'OPERA',
		ie: 'IE',
		ios: 'IOS'
	};

	if (mapping[browserName]) {
		browserName = mapping[browserName];
	}

	return `ZimbraXWebClient - ${browserName}${browserVersion} (${osName})`;
};
