import jwtStorage from '../utils/jwt';
import { getApplicationStorageUsedSize } from '../constants/storage';
import chunk from 'lodash-es/chunk';
import { WEBCLIENT_OFFLINE_BROWSER_KEY } from '../constants/offline';
export function isOfflineModeEnabled(offlineBrowserKey) {
	// Offline mode is enabled when localStorage contains a key that is also saved
	// to the server as zimbraPrefWebClientOfflineBrowserKey
	return (
		offlineBrowserKey &&
		!!~offlineBrowserKey.indexOf(localStorage.getItem(WEBCLIENT_OFFLINE_BROWSER_KEY))
	);
}

export function isOfflineId(id) {
	return /^~\d+/.test(id);
}

// Generating timestamp as id to avoid collision between cached message ids.
export function generateOfflineId() {
	return `~${new Date().getTime()}`;
}

/**
 * Given the context object provided by the main Provider, cleanup all offline data
 * @param {Object} context                    context provided to component tree
 * @param {Object} context.persistCache       the {@type CachePersistor} instance from apollo-cache-persist
 * @param {Object} context.offlineQueueLink   the {@type OfflineQueueLink} instance from the apollo link chain
 * @param {Object} context.client             the {@type ApolloClient} instance for the app
 */
export function clearOfflineData(context) {
	context.persistCache.purge(); // Clear the persisted cache
	context.offlineQueueLink.purge(); // Clear offline data waiting to be synced to the server
	context.client.clearStore(); // Clear the apollo store and in-memory-cache

	context.zimbraBatchClient.setJwtToken(null); // Clear JWT from both new and legacy client
	context.zimbra.setJwtToken(null);

	jwtStorage.clear(); // Clear JWT from localStorage
}

// Fire off a bunch of queries with different IDs
// Chunks requests into `itemsPerRequest`
// Stops requesting when storage quote passes `stopRequestingAboveQuota` percentage
// TODO: Consider using a separate cache for email messages via https://github.com/sysgears/apollo-cache-router
export function primeCache(
	componentContext,
	{ query, ids, variables },
	{ itemsPerRequest = 50, stopRequestingAboveQuota = 25 }
) {
	if (!ids || ids.length === 0) {
		return;
	}

	const { client, persistCache } = componentContext;

	// After every chunk of requests check if the cache is too large to continue.
	function shouldContinue() {
		return getApplicationStorageUsedSize(persistCache).then(
			size => size < stopRequestingAboveQuota
		);
	}

	// Request items in chunks to tweak performance
	return chunk(ids, itemsPerRequest).reduce(
		(chain, idsChunk) =>
			chain &&
			chain.then(shouldContinue).then(
				willContinue =>
					willContinue &&
					Promise.all(
						idsChunk.map(id =>
							client.query({
								query,
								fetchPolicy: 'cache-first',
								variables: {
									...variables,
									id
								}
							})
						)
					)
			),
		Promise.resolve()
	);
}
