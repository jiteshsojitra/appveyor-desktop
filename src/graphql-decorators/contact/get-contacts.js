import { graphql } from 'react-apollo';
import get from 'lodash-es/get';
import GetContact from '../../graphql/queries/contacts/get-contact.graphql';
import { pruneEmpty } from '../../utils/filter';

export default function withGetContacts(_config = {}) {
	return graphql(GetContact, {
		..._config,
		props: ({ data: { getContact, loading }, ownProps: { contactGroups = [] } = {} }) => {
			const contactGroup = get(getContact, '0') || {};
			const contactGroupMembers = (get(contactGroup, 'members') || []).reduce(
				(acc, { contacts }) => {
					const contact = contacts && pruneEmpty(contacts[0]);

					if (contact) {
						// GetContact API doesn't return `memberOf` property for Contacts so, we derive it from contactGroups.
						const memberOf = contactGroups
							.filter(
								({ members }) =>
									members &&
									!!members.filter(({ type, value }) => type === 'C' && value === contact.id).length
							)
							.map(({ id }) => id)
							.join(',');

						acc.push({
							...contact,
							memberOf
						});
					}

					return acc;
				},
				[]
			);

			return {
				contacts: contactGroupMembers,
				contactGroup: {
					...contactGroup,
					name: contactGroup.fileAsStr
				},
				loading
			};
		}
	});
}
