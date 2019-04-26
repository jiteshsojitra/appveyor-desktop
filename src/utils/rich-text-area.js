import { colorCodeToHex } from '../lib/util';

// Creates a safe wrapper around a document command
function createCommandProxy(type) {
	return function safeCommandProxy(...args) {
		try {
			return document[type](...args);
		} catch (err) {
			if (process.env.NODE_ENV !== 'production') {
				console.error(`document.${type}(${args.join(', ')}) ERR:`, err);
			}
		}
	};
}

export const execCommand = createCommandProxy('execCommand');
export const queryCommandState = createCommandProxy('queryCommandState');
export const queryCommandValue = createCommandProxy('queryCommandValue');

/**
 * Craft an object with keys representing the state of multiple text properties
 * as returned by document.execCommand('queryCommandState' || 'queryCommandValue')
 * To get the correct results, before invoking `getCommandState` call
 * `HTMLElement.focus` on the element to be queried.
 * @param {Component} RichTextArea     a rich text area that implements `queryCommandState` and `queryCommandValue`
 * @returns {Object}                   an object with keys representing the state of various document commands
 */
export function getCommandState() {
	let hilitecolor = queryCommandValue('hilitecolor') || queryCommandValue('backColor');
	// eslint-disable-next-line eqeqeq
	if (hilitecolor == undefined) {
		// Default to transparent
		hilitecolor = 'transparent';
	}

	hilitecolor = colorCodeToHex(hilitecolor);

	if (hilitecolor === '#ffffff') {
		hilitecolor = 'transparent';
	}

	return {
		forecolor: colorCodeToHex(queryCommandValue('forecolor') || 'rgb(0,0,0)'),
		hilitecolor,
		fontSize: queryCommandValue('fontSize'),
		fontName: queryCommandValue('fontName'),
		bold: queryCommandState('bold'),
		italic: queryCommandState('italic'),
		underline: queryCommandState('underline')
	};
}
