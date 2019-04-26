import { graphql } from 'react-apollo';
import CreateContactMutation from '../../graphql/queries/contacts/create-contact.graphql';
import ModifyContactMutation from '../../graphql/queries/contacts/modify-contact.graphql';
import AutoCompleteQuery from '../../graphql/queries/contacts/auto-complete.graphql';
import GetContact from '../../graphql/queries/contacts/get-contact.graphql';
import {
	getAutoSuggestionQueryVariables,
	getAllGetContactQueryVariables
} from '../../graphql/utils/graphql-variables';

const contactMutationFactory = (mutationName, propName) => () =>
	graphql(mutationName, {
		props: ({ mutate }) => ({
			[propName]: contact => {
				let zimbraInMemoryCache = null;

				return mutate({
					variables: {
						contact
					},
					update: cache => {
						zimbraInMemoryCache = cache;
					},
					refetchQueries: () => [
						...getAutoSuggestionQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
							query: AutoCompleteQuery,
							variables: cacheVars
						})),
						...getAllGetContactQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
							query: GetContact,
							variables: cacheVars
						}))
					]
				});
			}
		})
	});

export const withCreateContact = contactMutationFactory(CreateContactMutation, 'createContact');
export const withModifyContact = contactMutationFactory(ModifyContactMutation, 'modifyContact');
