import { h } from 'preact';
import { Text } from 'preact-i18n';
import { faultCode } from '../../utils/errors';

export default function SearchErrorText({ searchError }) {
	// Return the raw error if it is an unknown error.
	const errorCode = faultCode(searchError);

	return /mail.QUERY_PARSE_ERROR/.test(errorCode) ? (
		<Text id="search.error.couldNotParse" />
	) : (
		searchError &&
			searchError.message &&
			searchError.message.replace('Error: GraphQL error: Fault error: ', '')
	);
}
