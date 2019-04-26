import { h } from 'preact';
import { compose, withPropsOnChange } from 'recompose';
import accountInfo from '../graphql-decorators/account-info';
import { configure } from '../config';
import { LOCAL_FOLDER_ABSFOLDERPATH_PREFIX } from '../components/folder-list/util';

export const fetchLocalFolderConfig = (accountName, localStorePath) => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		const fs = require('fs');
		const path = require('path');
		try {
			const prefsFilePath = path.join(localStorePath, accountName, 'account_prefs.json');
			const localMailFolderPath = path.join(localStorePath, accountName, 'Mail');
			let accountPrefdata = JSON.parse(fs.readFileSync(prefsFilePath, 'utf8'));
			accountPrefdata = {
				...accountPrefdata,
				localFolders: accountPrefdata.localFolders.filter(f =>
					fs.existsSync(path.join(localMailFolderPath, f.name))
				) // We are updating the account prefs data to skip displaying not available local folders(which been deleted by user from local machine) and updating json file.
			};
			fs.writeFileSync(prefsFilePath, JSON.stringify(accountPrefdata));
			return accountPrefdata;
		} catch (err) {
			console.error("[Electron] account_prefs.json doesn't exist", err);
			return {};
		}
	}
};

/**
 * This method servers the temporary purpose of handling the backward compatibility in the configuration file
 * of the local folders. This is a patch fix, we need to comeup with a robust way of handling this.
 * @param {String} prefsFilePath
 * @param {Object} config
 */
const handleConfigBackwardCompatibiltiy = (prefsFilePath, config) => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		// ISSUE1: We added absFolderPath key which might not be present in the old configs
		const { localFolders } = config;
		let configUpdated = false;

		if (localFolders && localFolders.length) {
			localFolders.forEach(folder => {
				if (!folder.absFolderPath) {
					folder.absFolderPath = `${LOCAL_FOLDER_ABSFOLDERPATH_PREFIX}${folder.name}`;
					configUpdated = true;
				}
			});

			if (configUpdated) {
				const fs = require('fs');
				// write the config file so that app doesn't need to do it again
				fs.writeFileSync(prefsFilePath, JSON.stringify(config));
			}
		}

		return config;
	}
};

const readLocalFolderConfig = (accountName, localStorePath) => {
	if (typeof process.env.ELECTRON_ENV !== 'undefined') {
		const fs = require('fs');
		const path = require('path');

		try {
			const prefsFilePath = path.join(localStorePath, accountName, 'account_prefs.json');
			return handleConfigBackwardCompatibiltiy(
				prefsFilePath,
				JSON.parse(fs.readFileSync(prefsFilePath, 'utf8'))
			);
		} catch (err) {
			console.error("[Electron] account_prefs.json doesn't exist", err);
			return {};
		}
	}
};

export default function withAccountConfigure() {
	return compose(
		accountInfo(),
		configure('localStorePath'),
		withPropsOnChange(['account', 'localStorePath'], ({ account: { name }, localStorePath }) =>
			readLocalFolderConfig(name, localStorePath)
		),
		Child =>
			function WithAccountConfig(props) {
				return <Child {...props} />;
			}
	);
}
