import { findDataId, getVariablesFromDataId, getRootQuery } from './graphql-optimistic';
import get from 'lodash-es/get';

export const getAllContactSearchQueryVariables = client => {
	const contactSearchQueryVars = [];

	findDataId(client, '$ROOT_QUERY.search', fullCachePathWithVars => {
		const queryVars = getVariablesFromDataId(fullCachePathWithVars);
		const types = get(queryVars, 'types');
		const query = get(queryVars, 'query');

		return (
			types === 'contact' &&
			query &&
			(query.indexOf('#type:group') === -1 || query.indexOf('NOT #type:group') !== -1) &&
			contactSearchQueryVars.push(queryVars)
		);
	});

	return contactSearchQueryVars;
};

export const getAllContactListSearchQueryVariables = client => {
	const contactSearchQueryVars = [];

	findDataId(client, '$ROOT_QUERY.search', fullCachePathWithVars => {
		const queryVars = getVariablesFromDataId(fullCachePathWithVars);
		const types = get(queryVars, 'types');
		const query = get(queryVars, 'query');

		return (
			types === 'contact' &&
			query &&
			(query.indexOf('#type:group') !== -1 && query.indexOf('NOT #type:group') === -1) &&
			contactSearchQueryVars.push(queryVars)
		);
	});

	return contactSearchQueryVars;
};

export const getAutoSuggestionQueryVariables = client => {
	const autoSuggestionQueryVars = [];

	findDataId(client, '$ROOT_QUERY.autoComplete', fullCachePathWithVars => {
		const queryVars = getVariablesFromDataId(fullCachePathWithVars);
		autoSuggestionQueryVars.push(queryVars);
	});

	return autoSuggestionQueryVars;
};

export const getAllGetContactQueryVariables = client => {
	const data = getRootQuery(client);

	if (!data) {
		return;
	}

	return Object.keys(data).reduce((acc, currKey) => {
		if (currKey.indexOf('getContact') !== -1) {
			const queryVars = getVariablesFromDataId(currKey);
			acc.push(queryVars);
		}
		return acc;
	}, []);
};
