// import config from '../config';
import { memoize } from 'decko';
import { replaceReplyEmojis } from './util.js';

// stylesheet to inject into HTML messages
const STYLESHEET = `
	html, body { overflow:visible; height:auto; line-height:1.3; width:auto; padding:0; margin:0; background:none; }
	body { margin:10px; }
	blockquote {
		margin: 10px 0 10px 10px;
		padding: 0 0 0 10px;
		border-left: 3px solid #BBB;
	}
`;

// max length for generated textual content previews
const MAX_EXCERPT_LENGTH = 60;

// regex of element names/partials not permitted in email
const BLOCKED_ELEMENTS = /(script|link|embed|object|iframe|frameset|video|audio|form|input|textarea)/;

// attributes to strip
const BLOCKED_ATTRIBUTES = /(^srcdoc$|^on|[^a-z-])/i;

// attributes to treat as URLs (resolving cid: references)
const URL_ATTRIBUTES = /^(src|href|background)$/i;

const ATTR_MAP = {
	dfsrc: 'src',
	'data-src': 'src'
};

// attributes to treat as URLs (resolving cid: references)
const JS_ATTRIBUTES = /^(src|href)$/i;

const EMPTY_ARRAY = [];

const UNICODE_SURROGATE = /\\u([DF][8-F][0-F]{2})\\u([0-F]{4})/g;

/** Convert "\\uD83D\\uDC4B" to "\uD83D\uDC4B" */
const replaceSurrogatePair = (s, a, b) =>
	String.fromCharCode(parseInt(a, 16)) + String.fromCharCode(parseInt(b, 16));

/** Convert a given text or HTML excerpt to a pure text one, capped at 40 charaters. */
const ensureTextExcerpt = memoize(text => {
	text = String(text || '');
	if (text.match(/(<\/?[a-z][a-z0-9:-]*(\s+.*?)?>|&[a-z0-9#]{2,};)/i)) {
		text = htmlToText(text);
	}
	if (text.length > MAX_EXCERPT_LENGTH) {
		text = text.substring(0, MAX_EXCERPT_LENGTH);
	}
	return text;
});

/** Convert HTML to text via DOMParser */
const htmlToText = memoize(html => {
	// collapse non-semantic whitespace, then inject whitespace after paragraphs, headings and line breaks:
	html = html
		.replace(/(^\s+|\s+$|\s*\n+\s*)/g, ' ')
		.replace(/\n*(<(p|div|blockquote|li|ul|ol|h[1-6])>|<[bh]r(\s.*)?>)\n*/gi, '\n$1');
	const doc = new DOMParser().parseFromString(html, 'text/html');

	// Inject list markers (numeric or bullets) into all list items before serializing:
	const listItems = doc.getElementsByTagName('li');
	for (let i = 0; i < listItems.length; i++) {
		const li = listItems[i],
			parent = li.parentNode,
			index = parent.__index == null ? (parent.__index = 0) : ++parent.__index,
			text = parent.nodeName === 'OL' ? `${index + 1}.` : '-';
		li.insertBefore(doc.createTextNode('  ' + text + ' '), li.firstChild);
	}

	return doc.body.textContent + '\n';
});

export { ensureTextExcerpt, htmlToText };

/** Given a message object (`{ html, text, attachments, inlineAttachments }`), produce a sanitized HTML body.
 *	@param {Message} message
 *	@param {object} options
 *	@param {boolean} [options.allowImages=true]
 */
export function getEmailHTMLDocument(
	{ id, html, text, excerpt, attachments, inlineAttachments, isDecodedMessage },
	options
) {
	options = options || {};
	options.resources = options.resources || [];

	let sanitized = '';
	html = html || '';
	if (!html) {
		if (!text && excerpt && !isDecodedMessage) {
			text = ensureTextExcerpt(excerpt);
		}
		if (text) {
			sanitized =
				'<body style="white-space:pre-wrap;">' +
				text
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/\n/g, '<br />') +
				'</body>';
		}
	} else {
		const opts = {
			...options,
			attachments: [].concat(attachments || [], inlineAttachments || [])
		};
		for (let i = opts.attachments.length; i--; ) opts.attachments[i].messageId = id;

		const dom = new DOMParser().parseFromString(html, 'text/html');
		walk(dom, opts);
		sanitized = dom.documentElement.innerHTML;
	}
	return `<!DOCTYPE html>\n<html><style>${STYLESHEET}</style>${sanitized}</html>`;
}

export function getEmailBody({ id, html, text, excerpt, attachments, inlineAttachments }, options) {
	options = options || {};
	options.resources = options.resources || [];

	let sanitized = '';
	html = html || '';
	if (!html) {
		if (!text && excerpt) {
			text = ensureTextExcerpt(excerpt);
		}
		if (text) {
			sanitized =
				'<body style="white-space:pre-wrap;">' +
				text
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/\n/g, '<br />') +
				'</body>';
		}
	} else {
		const opts = {
			...options,
			attachments: [].concat(attachments || [], inlineAttachments || [])
		};
		for (let i = opts.attachments.length; i--; ) opts.attachments[i].messageId = id;

		const dom = new DOMParser().parseFromString(html, 'text/html');
		walk(dom, opts);
		sanitized = dom.body.innerHTML;
	}
	return sanitized;
}

/** @private attempt to find an attachment matching the given CID. */
function getAttachmentByCid(cid, attachments) {
	if (cid) {
		cid = String(cid)
			.toLowerCase()
			.replace(/^\s*?cid:\s*?/gi, '');
		if (attachments.length > 0) {
			for (let i = attachments.length; i--; ) {
				const { contentId, part, messageId, base64, type } = attachments[i];
				if (
					String(contentId)
						.toLowerCase()
						.replace(/[<>]/g, '') === cid
				) {
					if (!base64 && contentId) {
						// @TODO use drop fallback
						return (
							attachments[i].url ||
							`/@zimbra/service/home/~/?auth=co&id=${encodeURIComponent(
								messageId
							)}&part=${encodeURIComponent(part)}`
						);
					} else if (base64) {
						return `data:${type};base64, ${base64}`;
					}
				}
			}
		}
	}
	return false;
}

function sanitizeCss(css, attachments) {
	css = css.replace(/@import/gi, '@import-not-supported');
	css = css.replace(
		/url\(\s*?(['"]?)\s*?cid:\s*?(.*?)\s*?\1\s*?\)/gi,
		(s, b, cid) => `url("${getAttachmentByCid(cid, attachments) || ''}")`
	);
	return css;
}

/** @private sanitize a DOM */
function walk(node, opts) {
	const type = node.nodeType,
		att = (opts && opts.attachments) || EMPTY_ARRAY;

	if (type === 3) {
		if (node.nodeValue.match(UNICODE_SURROGATE)) {
			node.nodeValue = node.nodeValue.replace(UNICODE_SURROGATE, replaceSurrogatePair);

			//since emojione doesn't handle converting unicode inside of <blockquote>
			//do it ourselves
			replaceReplyEmojis(node);
		}
		return;
	}

	if (!node.childNodes) return;

	const n = String(node.nodeName).toLowerCase();
	if (type === 8 || n.match(BLOCKED_ELEMENTS)) {
		return node.parentNode.removeChild(node);
	}

	if (n === 'style') {
		for (let i = node.childNodes.length; i--; ) {
			node.childNodes[i].textContent = sanitizeCss(node.childNodes[i].textContent || '', att);
		}
	}

	if (n === 'a') {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer');
	}

	if (node.attributes) {
		const attrs = Array.prototype.slice.call(node.attributes);
		for (let i = attrs.length; i--; ) {
			let { name, value } = attrs[i],
				lcName = String(name)
					.toLowerCase()
					.trim();

			if (ATTR_MAP[lcName]) {
				node.removeAttribute(name);
				lcName = name = ATTR_MAP[lcName];
				node.setAttribute(name, value);
			}

			if (lcName === 'style') {
				node.setAttribute(name, sanitizeCss(value));
				continue;
			}

			if (lcName.match(BLOCKED_ATTRIBUTES)) {
				node.removeAttribute(name);
				continue;
			}

			if (lcName.match(URL_ATTRIBUTES)) {
				const matches = String(value).match(/^\s*?cid\s*?:\s*(.+?)\s*$/i);
				if (matches) {
					node.setAttribute('data-cid', matches[1]);
					const attachment = getAttachmentByCid(matches[1], att) || '';
					node.setAttribute(name, attachment);
					if (attachment && attachment !== '') {
						opts.resources.push({ type: 'img', mode: 'attachment', url: attachment });
					}
				} else if (lcName !== 'href') {
					opts.resources.push({ type: 'img', mode: 'external', url: value });
					// strip image src if disabled
					if (opts.allowImages === false) node.removeAttribute(name);
				}
			}

			if (lcName.match(JS_ATTRIBUTES)) {
				const matches = String(value).match(/^\s*?javascript\s*?:\s*?(.*)$/i);
				if (matches) node.removeAttribute(name);
			}
		}
	}

	for (let i = node.childNodes.length; i--; ) walk(node.childNodes[i], opts);
}

export function findElementByIdInEmail(dom, id) {
	return dom.querySelector(`[data-safe-id="${id}"], #${id}`);
}

export function insertAtCaret(win = window, html, rootElement) {
	// see https://stackoverflow.com/a/6691294/4545366
	const doc = win.document;
	let sel = win.getSelection(),
		range = sel && sel.getRangeAt && sel.rangeCount !== 0 && sel.getRangeAt(0);

	if (
		!range ||
		(rootElement &&
			!(rootElement === range.startContainer || rootElement.contains(range.startContainer)))
	) {
		(rootElement || doc.body).focus();
	}

	if (doc.queryCommandSupported('InsertHtml')) {
		// The easiest path, supported by all non-IE
		doc.execCommand('InsertHtml', 0, html);
	} else if (sel && sel.getRangeAt && sel.rangeCount) {
		// IE > 9
		range = sel.getRangeAt(0);
		range.deleteContents();

		// Range.createContextualFragment() would be useful here but is
		// only relatively recently standardized and is not supported in
		// some browsers (IE9, for one)
		const el = doc.createElement('div');
		el.innerHTML = html;
		const frag = doc.createDocumentFragment();
		let node, lastNode;
		while ((node = el.firstChild)) {
			lastNode = frag.appendChild(node);
		}
		range.insertNode(frag);

		// Preserve the selection
		if (lastNode) {
			range = range.cloneRange();
			range.setStartAfter(lastNode);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
		}
	} else if ((sel = doc.selection) && sel.type !== 'Control') {
		// IE < 9
		const originalRange = sel.createRange();
		originalRange.collapse(true);
		sel.createRange().pasteHTML(html);
	}
}

//https://stackoverflow.com/questions/27003900/position-cursor-after-element-when-inserting-into-contenteditable
export function placeCaretAfterElement(win, element) {
	if (win.getSelection) {
		let sel = win.getSelection();
		const doc = win.document;
		if (sel.getRangeAt && sel.rangeCount) {
			const range = sel.getRangeAt(0);

			const textNode = doc.createTextNode(' ');
			range.setStartAfter(element);
			range.insertNode(textNode);
			range.setStartAfter(textNode);
			range.collapse(true);
			sel = win.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}
}

//https://stackoverflow.com/questions/15157435/get-last-character-before-caret-position-in-javascript
export function getCharacterPrecedingCaret(rootElement) {
	let sel, range;
	if (window.getSelection) {
		sel = window.getSelection();
		if (sel.rangeCount > 0) {
			range = sel.getRangeAt(0).cloneRange();
			range.collapse(true);
			range.setStart(rootElement, 0);
			return range.toString().slice(-1);
		}
	}
}

/**
 * Get the word/token that is before the cursor and call predicateFn with it as the argument.
 * If predicateFn is true, set the active range on the document to everything from the word starting before the cursor up to the cursor
 * and then call the onReplace function with the response from predicateFn
 *
 * @param {function} predicateFn Function that should return false if the word should not be replaced, or something truthy if it should.  The response will be passed to onReplace
 * @param {function} onReplace Function to call to insert new content after the range has been set.  Called with the the response of predicateFn
 * @return {boolean} Whether onReplace was called or not
 */
export function replaceWordBeforeCursor(predicateFn, onReplace) {
	const sel = window.getSelection();
	const content = sel.anchorNode.textContent;
	const token = content
		.slice(0, sel.anchorOffset)
		.split(/\s/)
		.pop();
	const predicateResponse = predicateFn(token);
	if (!predicateResponse) return false;
	const range = document.createRange();
	range.setStart(sel.anchorNode, content.lastIndexOf(token));
	range.setEnd(sel.anchorNode, sel.anchorOffset);

	// Select the word so that it gets replaced with the emoji
	sel.removeAllRanges();
	sel.addRange(range);
	onReplace(predicateResponse);
	return true;
}

export function findAnchorTagInSelection(win) {
	let node = win.getSelection().anchorNode;
	while (node != null && node.nodeName !== 'A') {
		node = node.parentNode;
	}
	return node;
}

export function findElementParent(dom, elementId, parentTags) {
	const element = findElementByIdInEmail(dom, elementId);
	let tempNode = element;
	while (tempNode && (tempNode = tempNode.parentNode)) {
		if (tempNode.nodeType === 1 && parentTags.indexOf(tempNode.nodeName.toLowerCase()) > -1) {
			return tempNode;
		}
	}
	return element;
}

export function moveSelectionOutOfNonEditableArea(rootElement) {
	const sel = window.getSelection(),
		range = sel && sel.getRangeAt && sel.rangeCount !== 0 && sel.getRangeAt(0);
	let ancestor = range && range.commonAncestorContainer;

	if (!ancestor || !rootElement.contains(ancestor)) {
		return;
	}

	while (ancestor && (ancestor = ancestor.parentElement) && ancestor !== rootElement) {
		// When clicking on a contenteditable area, selection will go to the text node closest to the click.
		// It is possible that selection falls to a text node that is a child of a `contenteditable="false"`
		// container. In that case, move the caret to be after the non-editable container.
		if (ancestor.getAttribute && ancestor.getAttribute('contenteditable') === 'false') {
			placeCaretAfterElement(window, ancestor);
		}
	}
}

/**
 * Watch for a node to be delete from the DOM and call the onDelete handler when it is
 * @param {Node} node The DOM Node to watch for its deletion
 * @param {function} onDelete Callback, called with node as it's only argument
 */
export function addNodeDeleteHandler(node, onDelete) {
	const observer = new MutationObserver((mutations, o) => {
		mutations.some(({ removedNodes }) => {
			for (let i = removedNodes.length; i--; ) {
				if (removedNodes.item(i) === node) {
					onDelete(node);
					o.disconnect();
					return true;
				}
			}
		});
	});
	observer.observe(node.parentNode, { childList: true });
}
