// The rich-text-area will preserve selection range, but will not preserve it
// more than 3 times
export const MAX_RANGE_REUSES = 3;

// These properties will have their state tracked by the rich-text-area
export const WATCH_COMMAND_STATE_PROPERTIES = [
	'forecolor',
	'hilitecolor',
	'bold',
	'italic',
	'underline',
	'fontSize',
	'fontName'
];
