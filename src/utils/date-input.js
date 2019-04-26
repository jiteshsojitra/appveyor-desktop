/**
 * Givens a value and a list of formats, test if that value matches at least 1 of those formats.
 * @param {String} value              a value that may be a date string
 * @param {String[]} formats          a list of formats to be tested, e.g. "MM/DD/YYYY"
 * @param {String} [delimeter='/']    the delimeter seperating segments of the date format
 * @returns {Boolean}                 returns true if the {@param value} matches at least one of the {@param formats}
 * @example
 *   matchesFormats('1/2/3456', [ 'M/D/YYYY' ]) === true
 *   matchesFormats('01/02/3456', [ 'M/D/YYYY' ]) === false
 *   matchesFormats('01/02/3456', [ 'M/D/YYYY', 'MM/MD/YYYY' ]) === true
 *   matchesFormats('01-02-3456', [ 'M-D-YYYY' ], '-') === true
 */
export function matchesFormats(value, formats, delimeter = '/') {
	const tokens = value.split('');
	return formats.some(
		format =>
			format.length === value.length &&
			tokens.every(
				(token, index) =>
					(token === delimeter && format[index] === delimeter) || /[0-9]/.test(token)
			)
	);
}
