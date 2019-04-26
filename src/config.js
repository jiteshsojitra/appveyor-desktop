import defaultConfig from '../clients/default/config.json';
import preconf from 'preconf';
import merge from 'lodash-es/merge';
import { getLocalPrefs, updateLocalPrefs, createLocalPrefs } from './utils/desktop-prefs';

let config = defaultConfig;

if (typeof process.env.ELECTRON_ENV !== 'undefined') {
	const path = require('path');
	const { remote } = require('electron');
	let data = getLocalPrefs();
	if (data) {
		data = JSON.parse(data);
		// TODO: Deep merge instead of shallow
		config = merge({}, defaultConfig, data);
	} else {
		createLocalPrefs();
	}
	config.localStorePath = path.join(remote.app.getPath('userData'), '..');
	updateLocalPrefs(config);
}

export const updateConfig = (configName, value) => {
	config[configName] = value;
	config = merge({}, config);
	updateLocalPrefs(config);
};

export default config;
export const configure = preconf(null, config);
