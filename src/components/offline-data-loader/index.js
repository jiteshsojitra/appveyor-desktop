import { Component } from 'preact';
import { branch, compose } from 'recompose';
import { connect } from 'preact-redux';
import withAccountInfo from '../../graphql-decorators/account-info';
import get from 'lodash-es/get';
import { isOfflineModeEnabled } from '../../utils/offline';
import withOfflineFolder from '../../graphql-decorators/offline-sync/with-offline-folder';
import { CONTACTS, EMAILED_CONTACTS } from '../../constants/folders';
import { CONTACTS_VIEW } from '../../constants/views';

@connect(
	state => ({
		isOffline: get(state, 'network.isOffline')
	}),
	null
)
@withAccountInfo(({ data: { accountInfo: account } }) => ({
	offlineModeEnabled: isOfflineModeEnabled(
		get(account, 'prefs.zimbraPrefWebClientOfflineBrowserKey')
	)
}))
@branch(
	({ offlineModeEnabled }) => offlineModeEnabled,
	compose(
		// @TO Do: Need to think of more generic approach to incorporate similar code here (Which is now moved to screen/mail/index.js)
		withOfflineFolder({
			folderName: EMAILED_CONTACTS,
			folderType: CONTACTS_VIEW
		}),
		withOfflineFolder({
			folderName: CONTACTS,
			folderType: CONTACTS_VIEW
		})
	)
)
export default class OfflineDataLoader extends Component {
	render() {
		return null;
	}
}
