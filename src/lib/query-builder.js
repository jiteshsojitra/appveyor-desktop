import partition from 'lodash-es/partition';

/**
 * A collection of utility functions for creation and parsing of query strings
 */

/**
 * Return true if a word begins with a special identifier used as a query tag.
 * Not a comprehensive list of available query identifiers.
 */
function isQueryTag(word) {
	return (
		['has', 'attachment', 'in', 'tag', 'larger', 'smaller', 'before', 'date'].indexOf(
			word.split(':')[0]
		) !== -1
	);
}

/**
 * Remove trailing and leading quotation marks. "hello" -> hello
 */
function trimQuotationMarks(words) {
	return words.replace(/(?:^['"])|(?:['"]$)/g, '');
}

/**
 * Given user input, seperate query tags from floating words which are interpretted as the filename
 */
export function partitionTagsAndFilename(searchTerm) {
	if (!searchTerm) {
		return searchTerm;
	}
	const [queryTags, filename] = partition(searchTerm.split(' '), isQueryTag);
	return `filename:"${trimQuotationMarks(filename.join(' '))}" ${queryTags.join(' ')}`;
}

/**
 * Given a full query, extract one tag from that query
 * @param {String} searchForTag      An identifier of a special query tag to find in the query, e.g. `filename:`
 * @param {String} query             The query to search for the `searchForTag` in.
 * @return {String}                  Returns the value associated with the tag passed in
 * @example <caption>Extract the `filename:` field from a query</caption>
 *   var filename = getTagFromQuery('filename', 'filename:"This is the filename" larger:1KB');
 *   filename === "This is the filename" // The result is returned without quotation marks
 */
export function getTagFromQuery(searchForTag, query) {
	if (searchForTag.charAt(searchForTag.length - 1) !== ':') {
		searchForTag += ':';
	}

	let tagIdx = query.indexOf(searchForTag);
	if (tagIdx !== -1) {
		tagIdx += searchForTag.length;
		const firstChar = query.charAt(tagIdx);
		const isQuoted = firstChar === `'` || firstChar === `"`;

		// If the tag has a quoted string, take the whole quoted string. Otherwise just take one word.
		if (isQuoted) {
			return trimQuotationMarks(query.slice(tagIdx, query.indexOf(firstChar, tagIdx + 1)));
		}

		return query.slice(tagIdx, query.indexOf(' ', tagIdx));
	}
}
