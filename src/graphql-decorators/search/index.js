import { graphql } from 'react-apollo';
import { capitalizeFirstLetter } from '../../lib/util';
import last from 'lodash/last';
import unionBy from 'lodash/unionBy';
import get from 'lodash/get';

import Search from '../../graphql/queries/search/search.graphql';

const TYPE_MAP = {
	conversation: 'conversations',
	message: 'messages',
	contact: 'contacts',
	appointment: 'appointments',
	task: 'tasks',
	wiki: 'wikis',
	document: 'documents'
};

function mergeResults(prev, next, type) {
	return next.search && next.search[type]
		? unionBy(prev.search[type], next.search[type], 'id') // merge items by id
		: prev.search[type];
}

/**
 * Given two search results, merge them together
 */
export function mergeSearches(prev, next) {
	if (!next) {
		return prev;
	}

	return {
		...next.search,
		contacts: mergeResults(prev, next, 'contacts'),
		messages: mergeResults(prev, next, 'messages'),
		conversations: mergeResults(prev, next, 'conversations')
	};
}

export default function withSearch(_config = {}) {
	const { name = 'search', ...config } = _config;

	function getOptions(props) {
		return typeof config.options === 'function' ? config.options(props) : config.options;
	}

	return graphql(Search, {
		props: ({ ownProps, data: { error, fetchMore, loading, refetch, search } = {} }) => ({
			[name]: search,
			[`${name}Error`]: error,
			[`${name}Loading`]: loading,
			[`refetch${capitalizeFirstLetter(name)}`]: refetch,
			[`${name}LoadNext`]: () => {
				const options = getOptions(ownProps);
				const lastItem = last(get(search, TYPE_MAP[options.variables.types]));

				return fetchMore({
					variables: {
						query: Search,
						...options.variables,
						cursor: {
							id: get(lastItem, 'id'),
							sortVal: get(lastItem, 'sortField')
						}
					},
					updateQuery: (previousResult, { fetchMoreResult }) => ({
						...fetchMoreResult,
						search: mergeSearches(previousResult, fetchMoreResult)
					})
				});
			}
		}),
		...config
	});
}
