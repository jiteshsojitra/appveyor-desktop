const Application = require('spectron').Application;

function getAppPath() {
	let appDir = null;
	if (process.platform === 'darwin') {
		appDir = '/Applications/Zimbra X.app/Contents/MacOS/Zimbra X';
	} else if (process.platform === 'win32') {
		appDir = 'C:\\Program Files\\Zimbra X\\Zimbra X.exe';
	}
	return appDir;
}

const app = new Application({
	path: getAppPath(),
	startTimeout: 20000
});

module.exports = app;