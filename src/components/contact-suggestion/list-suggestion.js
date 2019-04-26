import { Component } from 'preact';

import withGetContacts from '../../graphql-decorators/contact/get-contacts';

import { USER_FOLDER_IDS } from '../../constants';

@withGetContacts({
	skip: ({ id, contacts }) => !id || contacts,
	options: ({ id }) => ({
		variables: {
			id,
			derefGroupMember: true
		}
	})
})
export class ListSuggestion extends Component {
	componentWillReceiveProps({ contacts, loading }) {
		const { onAddContacts } = this.props;
		if (!loading) {
			const formattedContacts = contacts
				.filter(contact => contact.folderId !== USER_FOLDER_IDS.TRASH.toString())
				.map(contact => {
					const { attributes, ...rest } = contact;
					return {
						...rest,
						...attributes
					};
				});
			onAddContacts(formattedContacts);
		}
	}
	render() {
		return null;
	}
}
