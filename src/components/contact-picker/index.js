import { h, Component } from 'preact';
import get from 'lodash-es/get';
import { withProps } from 'recompose';
import { connect } from 'preact-redux';
import isString from 'lodash/isString';
import cloneDeep from 'lodash-es/cloneDeep';
import { Text } from 'preact-i18n';
import array from '@zimbra/util/src/array';
import ContactPickerDialog from './dialog';
import withAccountInfo from '../../graphql-decorators/account-info';
import withGetContactFolders from '../../graphql-decorators/contact/folders';
import { isLicenseActive } from '../../utils/license';
import withSearch from '../../graphql-decorators/search';
import {
	getMailboxMetadata,
	withSetMailboxMetaData
} from '../../graphql-decorators/mailbox-metadata';
import { addressToContact } from '../../utils/contacts';
import { USER_FOLDER_IDS } from '../../constants';
import getContext from '../../lib/get-context';
import { isOfflineModeEnabled } from '../../utils/offline';
import { getFolderData } from '../../graphql/utils/graphql-optimistic';

@connect(
	state => ({
		isOffline: get(state, 'network.isOffline')
	}),
	null
)
@withAccountInfo(({ data: { accountInfo: account } }) => ({
	isEnterprise: isLicenseActive(account.license),
	offlineModeEnabled: isOfflineModeEnabled(
		get(account, 'prefs.zimbraPrefWebClientOfflineBrowserKey')
	),
	zimbraFeatureGalEnabled: account.attrs.zimbraFeatureGalEnabled
}))
@withGetContactFolders({
	props: ({ data: { getFolder }, ownProps: { isEnterprise, zimbraFeatureGalEnabled } }) => {
		let folders = get(getFolder, 'folders.0.folders') || [];

		if (isEnterprise && zimbraFeatureGalEnabled) {
			folders = cloneDeep(folders);
			!folders.find(fol => fol.id === 'galContacts') &&
				folders.push({ id: 'galContacts', name: <Text id="contacts.picker.galContacts" /> });
		}

		return {
			folders: folders.filter(({ id }) => parseInt(id, 10) !== USER_FOLDER_IDS.TRASH)
		};
	}
})
@withSearch({
	options: () => ({
		variables: {
			query: 'in:"Contacts" #type:group',
			types: 'contact',
			sortBy: 'nameAsc',
			limit: 1000,
			needExp: true
		}
	}),
	props: ({ data: { search } }) => ({
		contactGroups: get(search, 'contacts') || []
	})
})
@getMailboxMetadata()
@withSetMailboxMetaData()
@getContext(({ client }) => ({ client }))
@withProps(({ folders, client, isOffline, offlineModeEnabled }) => ({
	...(isOffline &&
		offlineModeEnabled && {
			folders: folders.filter(f => {
				if (Object.values(USER_FOLDER_IDS).includes(Number(f.id))) return true;
				const folderContacts = getFolderData(
					client,
					'$ROOT_QUERY.search',
					f.name,
					'NOT #type:group'
				);
				return folderContacts && folderContacts.contacts && folderContacts.contacts.length;
			})
		})
}))
export default class ContactPicker extends Component {
	state = {
		selected: [],
		additionalContacts: [],
		folder: get(this.props, 'mailboxMetadata.zimbraPrefContactSourceFolderID')
	};

	setSelected = selected => this.setState({ selected });

	setFolder = folder => {
		this.props.setMailboxMetadata({
			zimbraPrefContactSourceFolderID: folder
		});

		this.setState({ folder });
	};

	componentWillMount() {
		const contacts = array(this.props.contacts)
			.filter(addr => !isString(addr))
			.map(addressToContact);

		this.setState({
			additionalContacts: contacts,
			selected: contacts.map(({ id }) => id)
		});
	}

	render(props, { selected, additionalContacts, folder }) {
		return (
			<ContactPickerDialog
				{...props}
				additionalContacts={additionalContacts}
				selected={selected}
				setSelected={this.setSelected}
				folder={folder}
				setFolder={this.setFolder}
			/>
		);
	}
}
