export const getLocalPrefPath = () => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		const { remote } = require('electron'),
			path = require('path');

		const userDataDir = remote.app.getPath('userData');
		return path.join(userDataDir, 'local_prefs.json');
	}
};

export const createLocalPrefs = () => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		try {
			const fs = require('fs'),
				prefsFilePath = getLocalPrefPath();

			const createStream = fs.createWriteStream(prefsFilePath);
			createStream.end();
		} catch (e) {
			console.error('[Electron] Error creating local preferences', e);
		}
	}
};

export const getLocalPrefs = () => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		try {
			const fs = require('fs'),
				prefsFilePath = getLocalPrefPath();
			return fs.existsSync(prefsFilePath) && fs.readFileSync(prefsFilePath, 'utf8');
		} catch (e) {
			console.error('[Electron] Error reading local preferences', e);
		}
	}
};

export const updateLocalPrefs = config => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		const fs = require('fs');
		const prefsFilePath = getLocalPrefPath();

		try {
			fs.writeFileSync(prefsFilePath, JSON.stringify(config));
		} catch (e) {
			console.error('[Electron] Error updating local preferences', e);
		}
	}
};
