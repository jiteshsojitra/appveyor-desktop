/**
 * Remove any consecutive whitespaces and newlines, and trim the result
 */
export function clean(markup) {
	return markup
		.replace(/[\t\n]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
