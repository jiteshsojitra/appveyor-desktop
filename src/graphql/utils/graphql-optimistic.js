import GetFolder from '../queries/folders/get-folder.graphql';
import SearchQuery from '../queries/search/search.graphql';
import MessageQuery from '../queries/message.graphql';
import get from 'lodash-es/get';
import find from 'lodash-es/find';
import castArray from 'lodash-es/castArray';
import { isUnread } from '../../utils/mail-item';
import { getCacheByType } from '../../utils/in-memory-cache';
import { CacheType } from '@zimbra/api-client';
import gql from 'graphql-tag';

/**
 * Given a query and variables, transform the result of reading that query and
 * write it back with the same query and variables
 */
export function mapQuery(client, options, mapCachedToData) {
	try {
		client.writeQuery({
			...options,
			data: mapCachedToData(client.readQuery(options))
		});
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * Given a partial dataId and a filter function, find a full dataId
 * @param {ApolloCacheProxy} client     The Apollo cache
 * @param {String} [partialDataId]      A part of the dataId, with or without variables
 * @param {Function} [predicate]        A function to find the correct full dataId
 * @returns {String}                    A full dataId including variables
 */
export function findDataId(client, partialDataId = '$ROOT_QUERY', predicate = () => true) {
	client = getCacheByType(client, CacheType.network);
	const data = client && get(client, 'cache.data.data', get(client, 'data.data'));
	if (!data) {
		return;
	}

	return Object.keys(data).filter(
		dataId => dataId.indexOf(partialDataId) !== -1 && predicate(dataId, data[dataId])
	)[0];
}

function getCachedData(client, partialDataId = '$ROOT_QUERY', predicate = () => true) {
	client = getCacheByType(client, CacheType.network);
	const data = client && get(client, 'cache.data.data', get(client, 'data.data'));
	if (!data) {
		return;
	}

	const cacheId = Object.keys(data).filter(
		dataId => dataId.indexOf(partialDataId) !== -1 && predicate(dataId)
	)[0];
	return data[cacheId];
}

export function getRootQuery(client) {
	client = getCacheByType(client, CacheType.network);
	return client && get(client, 'cache.data.data.ROOT_QUERY', get(client, 'data.data.ROOT_QUERY'));
}

/**
 * Given a dataId, parse the variables from it
 * @param {String} dataId    A dataId as returned by {@function findDataId}
 * @returns {Object}         An object containing parsed variables from the dataId
 * <example>
 *   getVariablesFromDataId('$ROOT_QUERY.search({ limit: 500, query: "in:Inbox" })') === { limit: 500, query: "in:Inbox" }
 */
export function getVariablesFromDataId(dataId) {
	try {
		return JSON.parse(dataId.replace(/^[^(]+\((.*)\)$/, '$1'));
	} catch (e) {}
}

export function getSearchInFolderDataId(client, folderName) {
	return findDataId(client, '$ROOT_QUERY.search', dataId => dataId.indexOf(folderName) !== -1);
}

function searchInContactPredicate(dataId, folderName, predicatePhrase) {
	if (folderName) {
		const folderSubString = dataId.substring(dataId.indexOf('\\"') + 2, dataId.lastIndexOf('\\"'));
		return folderSubString.startsWith(folderName) && dataId.indexOf(predicatePhrase) !== -1;
	}
	// This cache id contains data for "All Contacts"
	return dataId.indexOf(`"${predicatePhrase}"`) !== -1;
}

function getSearchContactDataId(client, folderName, predicatePhrase) {
	return findDataId(client, '$ROOT_QUERY.search', dataId =>
		searchInContactPredicate(dataId, folderName, predicatePhrase)
	);
}

export function getSearchInFolderVariables(client, folderName) {
	return getVariablesFromDataId(getSearchInFolderDataId(client, folderName));
}

export function getSearchContactVariables(client, folderName, predicatePhrase = 'NOT #type:group') {
	return getVariablesFromDataId(getSearchContactDataId(client, folderName, predicatePhrase));
}

export function getFolderData(
	client,
	partialDataId,
	folderName,
	predicatePhrase = 'NOT #type:group'
) {
	const cachedData = getCachedData(client, partialDataId, dataId =>
		searchInContactPredicate(dataId, folderName, predicatePhrase)
	);
	return cachedData;
}

/**
 * Resolve a folderId or id to a folderName
 * @param {ApolloClient}
 * @param {Object|String|Function}    if object, look up folder id in cache. if string, return string. if function, re-resolve result of invocation.
 */
function resolveFolderName(client, folder) {
	if (folder && typeof folder !== 'string') {
		const id = folder.folderId || folder.id;
		if (id) {
			return get(findFolderInCache(client, { id: (id || '').toString() }), 'name');
		}

		if (typeof folder === 'function') {
			return resolveFolderName(client, folder());
		}
	}

	return folder;
}

export function optimisticAddFolderItemCount(client, folder, { nonFolderItemCount, unread }) {
	const folderName = resolveFolderName(client, folder);

	mapQuery(
		client,
		{
			query: GetFolder,
			variables: { view: null }
		},
		data => {
			data.getFolder.folders[0].folders = data.getFolder.folders[0].folders.map(cachedFolder =>
				cachedFolder.name !== folderName
					? cachedFolder
					: {
							...cachedFolder,
							nonFolderItemCount: Math.max(
								0,
								(cachedFolder.nonFolderItemCount | 0) + (nonFolderItemCount || 0)
							),
							unread: Math.max(0, (cachedFolder.unread | 0) + unread)
					  }
			);

			return data;
		}
	);
}

export function optimisticAddToFolder(client, folder, messages, isConv) {
	const folderName = resolveFolderName(client, folder);
	messages = castArray(messages);

	// 1. Increment the item count in the given folder
	optimisticAddFolderItemCount(client, folderName, {
		nonFolderItemCount: messages.length,
		unread: messages.filter(isUnread).length
	});

	const filterIds = messages.map(
		({ id, draftId, conversationId }) => (isConv && conversationId) || id || draftId
	);
	const key = isConv ? 'conversations' : 'messages';

	// If the folder does not exist or has no items in it, return only messages
	// If the folder does exist and has data, merge the items together
	optimisticSetSearchFolder(client, folderName, isConv, ({ data, folderExists }) => ({
		[key]:
			!folderExists || !data.search[key]
				? messages
				: messages.concat(data.search[key].filter(({ id }) => !~filterIds.indexOf(id)))
	}));
}

export function optimisticRemoveFromFolder(client, folder, messages, isConv) {
	const folderName = resolveFolderName(client, folder);
	messages = castArray(messages);

	// 1. Decrement the item count in the given folder
	optimisticAddFolderItemCount(client, folderName, {
		nonFolderItemCount: messages.length * -1,
		unread: messages.filter(isUnread).length * -1
	});

	const filterIds = messages.map(
		({ id, draftId, conversationId }) => (isConv && conversationId) || id || draftId
	);
	const key = isConv ? 'conversations' : 'messages';

	// Remove messages from the search results for folderName
	optimisticSetSearchFolder(client, folderName, isConv, ({ data }) => ({
		[key]: data.search[key] && data.search[key].filter(({ id }) => !~filterIds.indexOf(id))
	}));
}

export function optimisticSetSearchFolder(client, folder, isConv, mapDataToSearch) {
	// 1. Get the cache variables for `search({ in: "Inbox", ... })`
	const inboxVariables = getSearchInFolderVariables(client, folder);

	if (!inboxVariables) {
		// TODO: What if user hasnt ever loaded inbox?
		return;
	}

	const folderName = resolveFolderName(client, folder);
	const folderVariables = {
		...inboxVariables,
		types: isConv ? 'conversation' : 'message',
		query: `in:"${folderName}"`,
		limit: 50,
		recip: 2,
		sortBy: 'dateDesc',
		fullConversation: true
	};

	// 2. Find or create search results for Search query
	let searchData,
		folderExists = false;
	try {
		// Try to read the given folderName
		searchData = client.readQuery({
			query: SearchQuery,
			variables: folderVariables
		});
		folderExists = true;
	} catch (e) {
		// If it does not exist, use the Inbox data instead
		searchData = client.readQuery({
			query: SearchQuery,
			variables: inboxVariables
		});
	}

	const search =
		typeof mapDataToSearch !== 'function'
			? mapDataToSearch
			: mapDataToSearch({
					variables: folderVariables,
					data: searchData,
					folderExists
			  });

	// 3. Prepend the given messages to the search results
	client.writeQuery({
		query: SearchQuery,
		variables: folderVariables,
		data: {
			search: search && {
				...searchData.search,
				...search
			}
		}
	});
}

export function optimisticWriteMessage(client, messages) {
	[].concat(messages).forEach(message => {
		client.writeQuery({
			query: MessageQuery,
			variables: {
				// NOTE: These must be kept in sync with the query used by the MailScreen (src/screens/mail/)
				id: message.id
			},
			data: {
				message
			}
		});
	});
}

export function findFolderInCache(client, filter) {
	return find(
		client.readQuery({
			query: GetFolder,
			variables: {
				view: null
			}
		}).getFolder.folders[0].folders,
		filter
	);
}

export function optimisticSetInviteResponse(client, folderId, inviteId, participationStatus) {
	const appointmentFieldsFragment = gql`
		fragment appointmentFields on CalendarItemHitInfo {
			participationStatus
		}
	`;
	const appointmentDataId = findDataId(
		client,
		`$Folder:${folderId}`,
		(dataId, data) => data.inviteId === inviteId
	);

	if (appointmentDataId) {
		const data = client.readFragment({
			id: appointmentDataId,
			fragment: appointmentFieldsFragment,
			__typename: 'CalendarItemHitInfo'
		});
		data.participationStatus = participationStatus;
		client.writeFragment({
			id: appointmentDataId,
			fragment: appointmentFieldsFragment,
			data,
			__typename: 'CalendarItemHitInfo'
		});
	}
}
