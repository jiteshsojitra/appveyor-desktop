import ApolloClient from 'apollo-client';
import get from 'lodash/get';

export const getCacheByType = (client, type) => {
	if (client instanceof ApolloClient) {
		return get(client, 'cache.cache.caches').find(c => c.name === type);
	} else if (client && client.caches) {
		// since RoutingCache is not exported by apollo-cache-router so applying check on client.caches instead of constructor.
		return client.caches.find(c => c.name === type);
	} else if (client.cache) {
		return client.cache;
	}
	return client;
};
