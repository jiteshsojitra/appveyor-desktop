import { graphql } from 'react-apollo';
import GetContact from '../../graphql/queries/contacts/get-contact.graphql';

export default function withGetContactsMembership(_config = {}) {
	return graphql(GetContact, {
		..._config,
		props: ({ data: { getContact = [] } }) => {
			const contacts = getContact;

			return {
				contactMembership: contacts.map(contact => ({
					id: contact.id,
					groupIds: (contact.memberOf || '').split(',').filter(Boolean)
				}))
			};
		}
	});
}
