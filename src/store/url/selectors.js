import get from 'lodash-es/get';
import queryString from 'query-string';

export function getParsedSearch(state) {
	const search = get(state, 'url.location.search');
	const newQueryString = decodeURIComponent(search).replace(/^\??mailto:(\?to=)?/, 'to=');
	return queryString.parse(newQueryString.replace('?', '&'));
}

export function getRouteProps(state) {
	return state.url.routeProps || {};
}

export function getSearchQuery(state) {
	const { q } = getParsedSearch(state);
	return `${q || ''}`.trim();
}

export function getSearchEmail(state) {
	const { e } = getParsedSearch(state);
	return `${e || ''}`.trim();
}

export function getSearchFolder(state) {
	const { folder } = getParsedSearch(state);
	return `${folder || ''}`.trim();
}

export function getQueryFolder(state) {
	const { foldername } = getParsedSearch(state);
	return `${foldername || ''}`.trim();
}

export function getAdvancedSearchOptions(state) {
	const {
		subject,
		contains,
		after,
		before,
		from,
		to,
		hasAttachment,
		hasImage,
		dateTypeValue
	} = queryString.parse(state.url.location.search);
	const opts = {
		subject: `${subject || ''}`.trim(),
		contains: `${contains || ''}`.trim(),
		before: `${before || ''}`.trim(),
		after: `${after || ''}`.trim(),
		dateTypeValue: `${dateTypeValue || 'anytime'}`.trim(),
		from: `${from || ''}`.trim(),
		to: `${to || ''}`.trim(),
		hasAttachment: `${hasAttachment || ''}`.trim(),
		hasImage: `${hasImage || ''}`.trim()
	};

	return opts;
}

export function getView(state) {
	return state.url.view;
}
