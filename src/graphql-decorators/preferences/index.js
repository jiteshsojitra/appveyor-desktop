import { graphql } from 'react-apollo';

import modifyPrefs from '../../graphql/queries/preferences/preferences.graphql';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';

/**
 * Decorator that passes down a prop called "modifyPrefs" that calls the modifyPrefs mutation and optimistically updates
 * preferences in the store with the new preferences
 */
export function withModifyPrefs() {
	return graphql(modifyPrefs, {
		props: ({ mutate }) => ({
			modifyPrefs: prefs =>
				mutate({
					variables: {
						prefs
					},
					optimisticResponse: {
						__typename: 'Mutation',
						modifyPrefs: true
					},
					update: (proxy, { data: mutationResult }) => {
						if (mutationResult.__typename !== 'Mutation') {
							return;
						}

						const data = proxy.readQuery({ query: AccountInfoQuery });
						data.accountInfo.prefs = {
							...data.accountInfo.prefs,
							...prefs
						};
						proxy.writeQuery({ query: AccountInfoQuery, data });
					}
				})
		})
	});
}
