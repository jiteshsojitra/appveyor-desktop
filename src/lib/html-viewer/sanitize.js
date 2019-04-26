import dompurify from 'dompurify';
import emojione from 'emojione';
import { convertEmojis } from '../../lib/util';

emojione.imageType = 'svg';

const SAFE_ID =
	Date.now() +
	'.' +
	Math.random()
		.toString(36)
		.substring(2);

export const getSafeHtmlId = () => SAFE_ID;

/** Attributes that should be removed from the serialized message HTML */
export const STRIP_ATTRS = ['contenteditable', 'data-safe-html', 'data-safe-id', 'data-cid'];

/** Attributes to always allow when sanitizing (and not explicitly remove from serialized HTML) */
export const ALLOW_ATTRS = [
	'contenteditable',
	'data-safe-html',
	'data-safe-id',
	'data-cid',
	'embedded-card',
	'embedded-image',
	'collapsed',
	'emoji',
	'embedded-link-card',
	'button-toggle-shrink-image',
	'button-remove-image',
	'button-resize-card-options',
	'button-remove-card'
];

/** Attributes that mark nodes to be stripped from serialized message HTML */
export const STRIP_NODES = ['action-item-wrapper', 'button-remove-card', 'embedded-image-overlay'];

/** Options for DOMPurify */
const SANITIZE_OPTIONS = {
	// Disallow SVG, MathML, etc
	USE_PROFILES: { html: true },

	// If we want to support app deeplinks
	ALLOW_UNKNOWN_PROTOCOLS: true,

	FORBID_TAGS: ['form', 'iframe', 'script', 'eventsource', 'svg', 'use', 'picture'],

	ALLOW_DATA_ATTR: false,

	ADD_ATTR: ['data-cid', 'data-contains-cursor', ...STRIP_NODES, ...STRIP_ATTRS, ...ALLOW_ATTRS],

	FORBID_ATTR: ['tabindex', 'srcset', 'source', 'xlink:href'],

	ALLOWED_URI_REGEXP: /^(?:(?:https?:)?\/\/|[a-z-]+:)/i,

	// Remove contents of unknown elements
	KEEP_CONTENT: false,

	// Hoist styles and other globals into body
	WHOLE_DOCUMENT: true,
	FORCE_BODY: true,

	// We'd likely use these, just not in this demo
	RETURN_DOM_FRAGMENT: true,
	RETURN_DOM_IMPORT: false
};

const CACHE = {};

// always open links in new window
dompurify.addHook('afterSanitizeAttributes', node => {
	if ('target' in node) {
		node.setAttribute('target', '_blank');
	}
});

export default function sanitize(html, processors, isLocalFolder) {
	if (html in CACHE) return CACHE[html];
	const sanitized = doSanitize(html, processors, false, isLocalFolder);
	return (CACHE[html] = sanitized);
}

const each = (arr, fn) => Array.prototype.slice.call(arr).forEach(fn);

export function doSanitize(html, processors, returnDocument, isLocalFolder) {
	const frag = dompurify.sanitize(html, SANITIZE_OPTIONS);
	let doc = new DOMParser().parseFromString(
		'<!DOCTYPE html><html><body></body></html>',
		'text/html'
	);
	doc.body.appendChild(frag);

	//convert all unicode and shortcode values to any applicable emoji images
	doc.body.innerHTML = convertEmojis(doc.body, doc);

	const after = [];

	if (processors != null) {
		for (let i = 0; i < processors.length; i++) {
			const r = processors[i](doc);
			if (typeof r === 'function') {
				after.push(r);
			}
		}
	}

	doc = inlineStyles(doc);
	each(doc.getElementsByTagName('head'), head => {
		head.parentNode.removeChild(head);
	});

	function sanitizeUrlAttribute(node, name) {
		if (node.hasAttribute(name) && !isWithinSafeRegion(node)) {
			const attr = node.getAttribute(name),
				sanitized = sanitizeUrl(
					attr,
					false,
					String(node.nodeName).toLowerCase() === 'img' && name === 'src',
					isLocalFolder
				);
			if (sanitized === false) node.removeAttribute(name);
			else node.setAttribute(name, sanitized);
		}
	}
	each(doc.querySelectorAll('[src], [href]'), node => {
		sanitizeUrlAttribute(node, 'href');
		sanitizeUrlAttribute(node, 'src');
	});

	function rm(attr, fn) {
		const all = doc.querySelectorAll('[' + attr + ']');
		for (let i = all.length; i--; ) {
			if (!isWithinSafeRegion(all[i])) {
				if (fn) fn(all[i]);
				else all[i].removeAttribute(attr);
			}
		}
	}
	rm('class');
	rm('is');
	rm('id', safeId);

	for (let i = 0; i < after.length; i++) {
		after[i](doc);
	}

	if (returnDocument) {
		return doc;
	}

	const innerHTML = doc.body.innerHTML;
	return innerHTML.indexOf('\n') === 0 ? innerHTML.slice(1, innerHTML.length) : innerHTML;
}

function safeId(el) {
	el.setAttribute('data-safe-id', el.getAttribute('id'));
	el.removeAttribute('id');
}

function isWithinSafeRegion(node) {
	let c = node;
	while (c) {
		if (
			c.__safe === true ||
			(c.getAttribute != null && c.getAttribute('data-safe-html') === SAFE_ID)
		) {
			return (node.__safe = true);
		}
		c = c.parentNode;
	}
	return false;
}

/**
 *	SECURITY NOTES:
 *
 *	-	Properties like `visibility` and `opacity` must NEVER be whitelisted.
 *		These enable occlusion/interception attacks (user clicks on hidden link without realizing).
 *
 *	-	Any properties that permit side-effecting values (URLs, behaviors, content, etc)
 *		should only be whitelisted if sufficiently sanitized via `sanitizeCssPropertyValue()`.
 */
const CSS_PROPERTY_WHITELIST = /^\s*(background(-(image|position(-[xy])?|repeat(-[xy])?|size|color))?|display|position|left|right|top|bottom|(?:(min|max)-)?(height|width)|float|clear|(margin|padding)(-(left|top|right|bottom))?|border(-.+)?|box-shadow|list-style(-.+)?|color|vertical-align|line-height|white-space|font(-(variant|family|size|weight|style))?|text-(align|transform|decoration(-(style|color|line))?))\s*$/i;

function sanitizeUrl(url, ret, allowZimbra, isLocalFolder) {
	url = String(url == null ? '' : url).replace(/(^['"\s]+|['"\s]+$)/g, '');
	const check = isLocalFolder
		? !url.match(/^(?:(?:(file?):)?\/\/|[a-z-]+:)/i)
		: !url.match(/^(?:https?:\/\/|(?:mailto|tel|cid|data):)/) &&
		  (!allowZimbra || !url.match(/^(\/@zimbra)?\/service\/home\/~\/\?/));
	if (check) {
		return ret != null ? ret : 'data:image/jpg,BLOCKED';
	}
	return url;
}

function sanitizeCssPropertyValue(value, key) {
	const lc = String(key).toLowerCase();
	if (lc === 'position' && value.match(/fixed/i)) return 'absolute';
	return value.replace(/url\(([^)]*)/g, (str, url) => sanitizeUrl(url));
}

function sanitizeInlineStyles(node) {
	const s = node.style;
	let str = '';
	for (let j = 0; j < s.length; j++) {
		const key = s[j];
		if (CSS_PROPERTY_WHITELIST.test(key)) {
			let value = s.getPropertyValue(key);
			if (value && value !== 'initial') {
				value = sanitizeCssPropertyValue(value, key);
				s.setProperty(key, value);
				str += key + ': ' + value + '; ';
			} else {
				str += key + ':; ';
			}
		} else {
			s.removeProperty(key);
		}
	}
	return str;
}

function inlineStyles(doc) {
	each(doc.querySelectorAll('*'), sanitizeInlineStyles);

	each(doc.getElementsByTagName('style'), style => {
		const rules = style.sheet && style.sheet.cssRules;
		for (let i = 0; rules && i < rules.length; i++) {
			const rule = rules[i];
			if (rule.type !== 1) continue;
			let key,
				value,
				css = '';
			const s = rules[i].style;
			for (let j = 0; j < s.length; j++) {
				key = s[j];
				if (
					CSS_PROPERTY_WHITELIST.test(key) &&
					(value = s.getPropertyValue(key)) &&
					value !== 'initial'
				) {
					css += key + ': ' + sanitizeCssPropertyValue(value, key) + '; ';
				} else if (value !== 'initial') {
					// console.log('blocked CSS property: '+key+': '+s.getPropertyValue(key)); // eslint-disable-line no-console
				}
			}
			let sel = rules[i].selectorText.replace(
				/\b(:(hover|focus|active|visited)|::[a-z-]+)\b/gi,
				''
			);
			// replace #foo with [data-safe-id="foo"]
			sel = sel.replace(/(^|\s)#([^\s:[.#+*~]+)/gi, '$1[data-safe-id="$2"]');
			const nodes = doc.querySelectorAll(sel);
			for (let j = nodes.length; j--; ) {
				nodes[j].setAttribute('style', (css + (nodes[j].getAttribute('style') || '')).trim());
			}
		}
		style.parentNode.removeChild(style);
	});

	return doc;
}
