import { primeCache } from '../../utils/offline';
import { mergeSearches } from '../search';
import { getSearchInFolderVariables } from '../../graphql/utils/graphql-optimistic';
import MessageQuery from '../../graphql/queries/message.graphql';
import SearchQuery from '../../graphql/queries/search/search.graphql';
import format from 'date-fns/format';
import subDays from 'date-fns/sub_days';

function getMailInFolder(client, { folderName = 'Inbox', numDays = 30 }) {
	return client.query({
		query: SearchQuery,
		variables: {
			...getSearchInFolderVariables(client, folderName),
			types: 'message',
			limit: 1000,
			query: `in:"${folderName}" AND after:${format(subDays(new Date(), numDays), 'M/D/YY')}`,
			nest: 1
		},
		fetchPolicy: 'network-only' // This may impose perf problems but, to update cache, network request is required. Due to bug - https://github.com/apollographql/apollo-client/issues/3880, can't put 'cache-and-network' as fetchPolicy
	});
}

export function primeMailboxCache(context, { folderName, numDays }) {
	const { client } = context;
	return getMailInFolder(client, { folderName, numDays }).then(({ data }) => {
		// Merge these results into the first page of search results for `folderName`
		const variables = getSearchInFolderVariables(client, folderName);

		const currentData = client.readQuery({
			query: SearchQuery,
			variables
		});

		client.writeQuery({
			query: SearchQuery,
			variables: {
				...variables,
				query: `in:"${folderName}"`,
				types: 'message',
				limit: 50,
				recip: 2,
				sortBy: 'dateDesc',
				fullConversation: true
			},
			data: {
				search: mergeSearches(currentData, data)
			}
		});

		const messageIds = (data.search.messages || []).map(({ id }) => id);

		/* const conversationIds = (data.search.messages || [])
				.map(({ conversationId }) => conversationId)
				.filter(Boolean); */

		return Promise.all([
			/* primeCache(context, {
					query: ConversationQuery,
					ids: conversationIds,
					variables: {
						fetch: 'all',
						html: true,
						needExp: true,
						max: 250000,
						neuter: false
					}
				}, {
					itemsPerRequest: 6
				}), */
			primeCache(
				context,
				{
					query: MessageQuery,
					ids: messageIds,
					variables: {}
				},
				{
					itemsPerRequest: 6
				}
			)
		]);
	});
}
