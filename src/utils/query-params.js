import queryString from 'query-string';

export function updateQuery(params, pathname = window.location.pathname) {
	return `${pathname}?${queryString.stringify({
		...queryString.parse(window.location.search),
		...params
	})}`;
}
