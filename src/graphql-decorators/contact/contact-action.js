import { graphql } from 'react-apollo';
import ContactActionMutation from '../../graphql/queries/contacts/contact-action.graphql';
import SearchQuery from '../../graphql/queries/search/search.graphql';
import AutoCompleteQuery from '../../graphql/queries/contacts/auto-complete.graphql';
import GetContact from '../../graphql/queries/contacts/get-contact.graphql';
import {
	getAllContactSearchQueryVariables,
	getAllContactListSearchQueryVariables,
	getAutoSuggestionQueryVariables,
	getAllGetContactQueryVariables
} from '../../graphql/utils/graphql-variables';

export default function withContactAction() {
	return graphql(ContactActionMutation, {
		props: ({ mutate }) => ({
			contactAction: variables => {
				let zimbraInMemoryCache = null;

				return mutate({
					variables,
					update: cache => {
						zimbraInMemoryCache = cache;
					},
					refetchQueries: () => {
						const refetchQueryList = [
							...getAllContactSearchQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: SearchQuery,
								variables: cacheVars
							})),
							...getAllContactListSearchQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: SearchQuery,
								variables: cacheVars
							})),
							...getAutoSuggestionQueryVariables(zimbraInMemoryCache).map(cacheVars => ({
								query: AutoCompleteQuery,
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
}
