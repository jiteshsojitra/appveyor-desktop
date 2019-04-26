// Returns true on touch devices
let isTouchSupported;
export function featureDetectTouch() {
	return typeof isTouchSupported !== 'undefined'
		? isTouchSupported
		: (isTouchSupported = 'ontouchstart' in document.documentElement);
}

// Returns true on browsers that support <input type="date">
// Source: https://stackoverflow.com/questions/10193294/how-can-i-tell-if-a-browser-supports-input-type-date
let isDateInputSupported;
export function featureDetectDateInput() {
	if (typeof isDateInputSupported !== 'undefined') {
		return isDateInputSupported;
	}
	const input = document.createElement('input');
	input.setAttribute('type', 'date');

	// A non-date value SHOULD be normalized when setting the value of the date
	// input; a normalized value implies that the browser supports a date input.
	// Not normalizing implies the input has fallen back to input type="text"
	const notADateValue = 'not-a-date';
	input.setAttribute('value', notADateValue);

	return (isDateInputSupported = input.value !== notADateValue);
}
