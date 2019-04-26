import { graphql } from 'react-apollo';
import CreateContactListMutation from '../../graphql/queries/contacts/create-contact-list.graphql';
import ModifyContactListMutation from '../../graphql/queries/contacts/modify-contact-list.graphql';
import SearchQuery from '../../graphql/queries/search/search.graphql';
import AutoCompleteQuery from '../../graphql/queries/contacts/auto-complete.graphql';
import GetContact from '../../graphql/queries/contacts/get-contact.graphql';
import {
	getAllContactSearchQueryVariables,
	getAllContactListSearchQueryVariables,
	getAutoSuggestionQueryVariables,
	getAllGetContactQueryVariables
} from '../../graphql/utils/graphql-variables';
import { USER_FOLDER_IDS } from '../../constants';

const contactListMutationFactory = (mutationName, propName) => () =>
	graphql(mutationName, {
		props: ({ mutate }) => ({
			[propName]: ({ groupName, folderId, groupId, ...rest }) => {
				let zimbraInMemoryCache = null;

				const contactList = {
					...(groupId && { id: groupId }),
					folderId: folderId || USER_FOLDER_IDS.CONTACTS,
					attributes: {
						fileAs: `8:${groupName}`,
						nickname: groupName,
						type: 'group',
						fullName: groupName
					},
					...rest
				};

				return mutate({
					variables: {
						contact: contactList
					},
					update: cache => {
						zimbraInMemoryCache = cache;
					},
					refetchQueries: () => {
						const refetchQueryList = [
							...getAllContactSearchQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: SearchQuery,
								variables: cacheVars
							})),
							...getAutoSuggestionQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: AutoCompleteQuery,
								variables: cacheVars
							})),
							...getAllContactListSearchQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: SearchQuery,
								variables: cacheVars
							})),
							...getAllGetContactQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: GetContact,
								variables: cacheVars
							}))
						];

						return refetchQueryList;
					}
				});
			}
		})
	});

export const withCreateContactList = contactListMutationFactory(
	CreateContactListMutation,
	'createContactList'
);
export const withModifyContactList = contactListMutationFactory(
	ModifyContactListMutation,
	'modifyContactList'
);
