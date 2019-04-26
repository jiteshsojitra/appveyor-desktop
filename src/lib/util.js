import moment from 'moment-timezone';
import findIndex from 'lodash/findIndex';
import find from 'lodash/find';
import isNil from 'lodash-es/isNil';
import { calendarDateFormat } from '../utils/calendar';
import saveAs from './save-as';
import CALENDAR_FORMATS from '../constants/calendar-formats';
import emojione from 'emojione';
const HOP = Object.prototype.hasOwnProperty;

/**
 * Find and return the element in `arr` that has a key with name `key` whose value is equal to `value` if `value`
 * is not a regex, or passes the regex test if `value` is a regex
 * @param {Array} arr
 * @param {String} key
 * @param {*} value A value to == match against (no type equality), or a regex to test
 * @return {*} The element in `arr` that has the key matching `value`, or undefined if not found
 */
export function pluck(arr, key, value) {
	const predicate =
		// eslint-disable-next-line eqeqeq
		value && value.test ? item => value.test(item[key]) : item => item[key] == value;
	return find(arr, predicate);
}

export function getId(obj) {
	if (!obj) return;
	if (typeof obj === 'object') obj = obj.id;
	if (typeof obj === 'number') obj = String(obj);
	return obj;
}

/**
 * Given two Arrays, return true if they are a list of the same IDs. Order matters.
 * Note: Two empty Arrays returns true
 */
export function shallowEqualIds(a, b) {
	if (!a || !b || a.length !== b.length) {
		return false;
	}
	return a === b || a.map(getId).join(',') === b.map(getId).join(',');
}

export function notFlagged(messages, flag) {
	return messages && messages.filter(m => !hasFlag(m, flag));
}

export function last(arr) {
	return arr[arr.length - 1];
}

export function getEmail(address) {
	const m = address && address.match(/<\s*(.+?)\s*>\s*$/);
	return m ? m[1] : address;
}

export function parseAddress(str) {
	str = str.trim();

	/**
	 * There are two types of email address (str) we receive here.
	 * 1) Composite Address with pattern: "Name <Email Address>" (When email address is selected from list)
	 * 2) Simple Address with pattern: "Email Address" (When email address is either typed by hand/copy pasted or not available in the list)
	 * So, in both cases, we need to parse email address such that we have values for address and name.
	 * In exceptional cases, we will just return address as it is.
	 */
	const simpleAddrMatchRegExp = /(.+)@(.+)/,
		compositeAddrMatchRegExp = /\s*(['"]?)(.*?)\1\s*<(.+)>/;

	let parts = str.match(compositeAddrMatchRegExp);

	if (!parts) {
		parts = str.match(simpleAddrMatchRegExp);

		if (parts) {
			return { address: parts[0], name: parts[1] };
		}

		return { address: str, name: str };
	}

	return { address: parts[3], name: parts[2] };
}

/** Get the domain portion of an email address
 * @example getEmailDomain("foo@my.bar.com") === "my.bar.com"
 *
 * @param {string} address the email address
 * @returns {string} the domain portion of the email address.  Returns a falsey value if no domain is found
 */
export function getEmailDomain(address) {
	const m = address && address.match(/@([^@]+)$/);
	return m && m[1];
}

/** Determine if an email address is an exact match or has a domain that matches a (sub)domain of the list of trusted addresses/domains
 * @param {string} emailAddress the email address to check
 * @param {string[]} trustedList an array of email addresses and/or domains to check against
 * @returns {boolean} true if domain is a (sub)domain of one of the domains in inDomains, false otherwise
 *
 * @example isAddressTrusted("joe@foo.bar.com", ["joe@foo.bar.com"]) === true //exact email match
 * @example isAddressTrusted("joe@foo.bar.com", ["example.org", "bar.com"]) === true //subdomain match against array
 * @example isAddressTrusted("joe@bar.com", ["foo.bar.com"]) === false //no match
 */
export function isAddressTrusted(emailAddress, trustedList) {
	if (!(emailAddress && trustedList)) return false;
	emailAddress = emailAddress.toLowerCase();
	const domain = getEmailDomain(emailAddress);
	return trustedList.some(t => {
		t = t.toLowerCase();
		const index = domain.indexOf(`.${t}`);
		return (
			t === emailAddress || t === domain || (index >= 0 && index === domain.length - t.length - 1)
		);
	});
}

export function serializeAddress(address, name) {
	return name ? `"${name.replace(/"/g, '\\"')}" <${address}>` : address;
}

export function filterDuplicates(arr) {
	const out = [];
	for (let i = 0; i < arr.length; i++) {
		if (arr.indexOf(arr[i]) === i) {
			out.push(arr[i]);
		}
	}
	return out;
}

/** weeks = reduce(toGroups(7), []) */
export const toGroups = size => (acc, item, index) => {
	const group = (index / size) | 0;
	if (group === acc.length) acc.push([item]);
	else acc[group].push(item);
	return acc;
};

export function deepClone(obj) {
	if (typeof obj !== 'object' || !obj) return obj;
	const out = Array.isArray(obj) ? [] : {};
	for (const i in obj)
		if (obj.hasOwnProperty(i)) {
			out[i] = deepClone(obj[i]);
		}
	return out;
}

export function empty(obj) {
	return obj === undefined || obj === null;
}

/** Returns only word characters from a string, in lowercase (useful for loose string comparison) */
export function munge(str) {
	if (typeof str !== 'string') str = String(str);
	return str.toLowerCase().replace(/[^a-z]/g, '');
}

// TODO: Migrate consumers of `callWith`
export { callWith } from '@zimbra/util/src/call-with';

export const FLAGS = {
	unread: 'u',
	flagged: 'f',
	replied: 'r',
	sentByMe: 's',
	forwarded: 'w',
	calendarInvite: 'v',
	draft: 'd',
	deleted: 'x',
	notificationSent: 'n',
	attachment: 'a',
	urgent: '!',
	lowPriority: '?',
	priority: '+'
};

export function hasFlag(message, flag) {
	const flags = message.flag || message.flags;
	return flags ? flags.indexOf(FLAGS[flag] || flag) > -1 : false;
}

export function removeFlag(flags, flag) {
	return (flags || '').replace(flag, '');
}

export function addFlag(flags, flag) {
	return removeFlag(flags, flag) + flag;
}

export function replaceFlag(flags, flagRemove, flagAdd) {
	return (flags || '').replace(flagRemove, flagAdd);
}

const emailRegex = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

/**
 * Return true when a string contains any email addresses.
 */
export function containsValidEmail(str) {
	return emailRegex.test(str);
}

/**
 * Return true when the entire string is one valid email
 */
export function isValidEmail(email) {
	const match = email && email.match(emailRegex);
	return !!match && match[0] === email;
}

export function replaceAttributes(object, originalAttr, newAttr) {
	const originalValue = object[originalAttr];
	delete object[originalAttr];
	object[newAttr] = originalValue;
	return object;
}

export function queryToString(queryObj) {
	let str = '',
		key;

	for (key in queryObj)
		if (HOP.call(queryObj, key)) {
			str += `${str ? '&' : ''}${encodeURIComponent(key)}=${encodeURIComponent(queryObj[key])}`;
		}

	return str;
}

export function parseQueryString(str) {
	const query = {},
		parts = str.split('&');

	for (let i = 0; i < parts.length; i++) {
		const [, key, value] = parts[i].match(/^([^=]+)(?:=(.*))?/);
		query[decodeURIComponent(key)] = decodeURIComponent(value);
	}
	return query;
}

export function removeNode(node) {
	if (!node) return;
	node.parentNode.removeChild(node);
}

/**
 * Returns `true` if any word in `keywords` is found in `target`.
 * @param {String} keywords            A word or space delimeted sentence for searching the `target`.
 * @param {String} target              The target to be search on.
 * @param {Boolean} [caseSensitive]    If true, the search will be case sensitive. Ignore case otherwise.
 * @return {Boolean}                   If any word from `keywords` is found in `target`, return true.
 */
export function hasCommonSubstr(keywords, target, caseSensitive) {
	let i;
	if (!keywords || !target) {
		return false;
	}
	if (!caseSensitive) {
		keywords = keywords.toLowerCase();
		target = target.toLowerCase();
	}

	if (target.indexOf(keywords) !== -1) {
		return true;
	}
	keywords = keywords.split(' ');
	for (i = 0; i < keywords.length; ++i) {
		if (target.indexOf(keywords[i]) !== -1) {
			return true;
		}
	}

	return false;
}

function decimalToHex(decimal) {
	let BGRString = decimal.toString(16); //this is in brg format instead of rgb
	if (BGRString.length < 6) {
		BGRString = `${Array(6 - BGRString.length + 1).join('0')}` + BGRString;
	}

	const colorParts = BGRString.match(/.{1,2}/g);
	return '#' + colorParts.reverse().join('');
}

// color => Decimal in IE, rgb()/rgba() in modern browsers
export function colorCodeToHex(color) {
	if (!isNaN(color)) return decimalToHex(color);

	const rgb = color.toString().match(/\d+/g);
	if (rgb && rgb.length === 4 && parseInt(rgb[3], 10) === 0) {
		return 'transparent';
	}

	return rgb && rgb.length > 2
		? '#' +
				('0' + parseInt(rgb[0], 10).toString(16)).slice(-2) +
				('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
				('0' + parseInt(rgb[2], 10).toString(16)).slice(-2)
		: 'transparent';
}

export function hexToRgb(hex) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
		  }
		: null;
}

// Parse the string into a valid url
export function parseUrl(url) {
	if (!url) return '';
	// url => //test.com
	url = url.indexOf('//') === 0 ? 'http:' + url : url;
	// url => test.com
	url = url.indexOf(':') === -1 ? 'http://' + url : url;
	url = encodeURI(url);

	const parsedUrl = url.toLowerCase();

	return parsedUrl.substr(0, 7) === 'http://' ||
		parsedUrl.substr(0, 8) === 'https://' ||
		parsedUrl.substr(0, 7) === 'mailto:' ||
		parsedUrl.substr(0, 6) === 'ftp://'
		? parsedUrl
		: '';
}

export function isValidPort(port) {
	return parseInt(port, 10) > 0 && parseInt(port, 10) <= 65535;
}

export function isValidURL(url) {
	const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
	return pattern.test(url);
}

/**
 * Given a URI, resolve it to a URL against the current document.
 * @param {String} uri       A URI, e.g. '/news/article/1'
 * @return {String}          A URL, e.g. 'http://localhost:8080/news/article/1'
 */
export function absoluteUrl(uri) {
	const a = document.createElement('a');
	a.href = uri;
	return a.href;
}

export function isSameOrigin(uri) {
	return window.location.origin === new URL(absoluteUrl(uri)).origin;
}

export function parseURI(uri) {
	const parser = document.createElement('a');
	parser.href = uri;

	return {
		protocol: parser.protocol,
		hostname: parser.hostname,
		port: parser.port,
		pathname: parser.pathname,
		search: parser.search,
		hash: parser.hash,
		host: parser.host
	};
}

/**
 * Returns a clone of {@param obj} without the keys listed in {@param properties}
 * @param {Object} obj             the object to be transformed
 * @param {String[]} properties    the properties to be deleted from {@param obj}
 * @returns {Object}               the {@param obj} object without the properties listed in {@param properties}
 */
export function objectWithoutProperties({ ...obj }, properties) {
	if (!properties || !properties.length) {
		return obj;
	}

	for (const property of properties)
		if (obj.hasOwnProperty(property)) {
			delete obj[property];
		}

	return obj;
}

/**
 * @desc returns A collection of time values formatted using {@param format} and distant an amount in seconds defined by {@param interval}
 * @param {number} interval
 * @param {String} format
 * @returns {String[]}
 */
export function timeRange(interval = 900, format = 'LT') {
	const start = moment('00:00:00', 'HH:mm:ss');
	const end = start.clone().add(1, 'days');
	const result = [];

	while (start.isBefore(end)) {
		result.push(start.format(format));
		start.add(interval, 'seconds');
	}

	return result;
}

/**
 * Converts from a time format to another
 * @param {String} sourceFormat
 * @param {String} targetFormat
 * @param {String} time
 */
export function switchTimeFormat(time, sourceFormat = 'h:mm A', targetFormat = 'HHmm') {
	return moment(time, sourceFormat).format(targetFormat);
}

export function circularIndex(n, len) {
	return (n + len) % len;
}

/**
 * Takes in an input of type 'file' and sends back a resolved Promise once the file has been read as Text.
 * @param {*} file
 * @param {String[]} supportedFormats
 */
export function getFileContent(file = {}, supportedFormats = ['ics']) {
	return new Promise((resolve, reject) => {
		if (findIndex(supportedFormats, format => format === file.name.match(/\.(\w+)$/)[1]) === -1) {
			reject(new Error('Unsupported File Format'));
		}
		const reader = new FileReader();
		reader.onload = (() => e => resolve(e.target.result))(file);
		reader.readAsText(file);
	});
}

/**
 * returns the number equivalent of the Day String supplied as parameter
 * @param {String} dayStr
 * @returns {number}
 */
export function getDayNumber(dayStr) {
	return moment()
		.day(dayStr)
		.day();
}

/**
 * Saves the downloaded calendar as a file given the format.
 * @param {*} result
 * @param {String} format
 */
export function saveCalendarAs(result, format = 'ics') {
	const blob = new Blob([].concat(result), {
		type: 'text/calendar'
	});
	const filename = `${result.match(/X-WR-CALNAME:(\w+)/)[1]}-${moment()
		.format('YYYY-MM-DD-hhmmss')
		.toString()}.${format}`;
	const url = window.URL.createObjectURL(blob);
	saveAs({
		url,
		filename
	});
}

export const getFolder = (folders, ident) =>
	folders.filter(
		// eslint-disable-next-line eqeqeq
		f => f.absFolderPath == ident || f.name == ident || f.id == ident
	)[0];

export const computeEmail = (name, host) => {
	if (!isNil(host.match(/(imap|pop)\.(\w+\.\w+)/))) {
		return `${name}@${host.match(/(imap|pop)\.(\w+\.\w+)/)[2]}`;
	}
	return '';
};

export function dirname(dir) {
	return dir && dir.replace(/\/(.*)\/.*$/, '/$1');
}

export function basename(dir) {
	return dir && dir.replace(/.*\/(.*)$/, '$1');
}

export function camelcase(str) {
	return str && str.replace(/-(.)/g, (m, $1) => `${$1.toUpperCase()}`);
}

export function uncamelcase(str) {
	return str && str.replace(/[A-Z]/g, m => ` ${m.toLowerCase()}`);
}

/**
 * Given a path, return the first parent directory in camelCase
 * @example assert(pathToSliceName('/a/b/camel-case/foo.js') === 'camelCase'))
 */
export function pathToSliceName(dir) {
	return camelcase(basename(dirname(dir)));
}

export function uriSegment(pathname, index = 0) {
	const segment = pathname && pathname.split('/')[index + 1];
	return segment !== '' ? segment : null;
}

/**
 * Extracts value out of an `input`'s event according to the `input`'s type
 * @param {*} e the input event
 */
export const getInputValue = e =>
	e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;

export function getDateKey(date) {
	return calendarDateFormat(date, CALENDAR_FORMATS);
}

export function formatBytes(bytes, decimals) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024,
		dm = decimals || 2,
		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Given some XML, select a node and return an attribute from that node
 * @param {String} xml        An xml string
 * @param {String} selector   A DOM selector
 * @param {String} attr       An attribute to be used by `Node.getAttribute(attr)`
 * @returns {String|Number}   returns the value of the given attribute on the selected Node
 */
export function getXmlAttribute(xml, selector, attr) {
	const node = new DOMParser().parseFromString(xml, 'application/xml').querySelector(selector);

	return node && node.getAttribute(attr);
}

export function ensureWithinRange(min, max, input) {
	return Math.min(max, Math.max(min, input));
}

// Given an array of words, add each suffix in suffixes to each word.
export function suffixArray(arr, suffixes) {
	return arr.reduce((acc, word) => [...acc, ...suffixes.map(suffix => `${word}${suffix}`)], []);
}

export function withoutStrings(arr) {
	return arr ? arr.filter(item => typeof item !== 'string') : [];
}

// Converts time to a correct syntax that can be understood by MomentJS
export function convertTo24Format(time12h) {
	const [time, modifier] = time12h.split(' ');
	let [hours, minutes] = time.split(':');
	if (hours === '12') {
		hours = '00';
	}
	if (modifier === 'PM' || modifier === 'pm' || modifier === 'Pm') {
		hours = parseInt(hours, 10) + 12;
	}
	return hours + ':' + minutes;
}

/**
 * Converts emoji unicode and shortnames to our emoji images
 * @param {DOM node} node		the DOM node to convert. doc.body will work fine, but you can be more specific if desired
 * @param {DOM Document} doc	the DOM document the node came from
 * @return {String}				returns the new innerHTML of the node
 */
export function convertEmojis(node, doc) {
	//at this time, we are not converting shortcodes, only unicodes,
	//due to complications caused from expected behavior with drafts (see PREAPPS-93)
	node.innerHTML = emojione.unicodeToImage(node.innerHTML);
	const svgs = doc.querySelectorAll('object[type="image/svg+xml"]'),
		imgs = doc.querySelectorAll('img[src*="emojione/assets"]');
	const svgLength = svgs.length;
	const imgsLength = imgs.length;

	//add [emoji] attribute to our emoji svg objects & imgs
	for (let i = 0; i < svgLength; i++) {
		svgs[i].setAttribute('emoji', '');
	}
	for (let i = 0; i < imgsLength; i++) {
		imgs[i].setAttribute('emoji', '');
	}

	return node.innerHTML;
}

/**
 * Converts emoji unicode to our emoji images,
 * helper function since emojione doesn't convert emojis in <blockquote>
 * @param {DOM node} node		the DOM node to convert. Should be of type===3 (text)
 * @return {DOM node}			returns node created by converting the emojis
 */
export function replaceReplyEmojis(node) {
	const emojiHTML = emojione.unicodeToImage(node.nodeValue);
	const emojiDoc = new DOMParser().parseFromString(emojiHTML, 'text/html');
	const imgs = emojiDoc.querySelectorAll('img[src*="emojione/assets"]');

	//only replace the node if images have actually been created from unicode
	imgs.length > 0 && node.parentNode.replaceChild(emojiDoc.body, node);

	return emojiDoc.body;
}

/**
 * Takes an emoji img node and replaces it with the alt text,
 * which should be the emoji's unicode
 * @param {DOM img node} node	the emoji img node to convert
 * @return {DOM node}			returns a custom 'emojitag' node
 */
export function emojiImageToUnicode(node) {
	//use our own tag name beause 'div' will cause the emojis to display on separate lines
	const emojiDiv = document.createElement('emojitag');
	const unicode = emojione.shortnameToUnicode(node.alt);
	emojiDiv.innerHTML = unicode;
	node.parentNode.replaceChild(emojiDiv, node);
	return node;
}
// Returns a Promise resolve with `snap`
export function initSnap() {
	return (
		initSnap.inFlight ||
		(initSnap.inFlight = new Promise(resolve => {
			if (window.snap) {
				resolve(window.snap);
			} else {
				const script = document.createElement('script');
				script.src = 'https://sdk.snapkit.com/js/v1/login_bitmoji.js';
				script.addEventListener('load', () => resolve(window.snap));
				document.body.appendChild(script);
			}
		}))
	);
}

export function base64ToBlob(imageData) {
	return fetch(imageData)
		.then(res => res.blob())
		.then(res => res);
}

export function reduceAncestors(node, fn, initialValue) {
	let result = fn(initialValue, node);
	while ((node = node.parentElement)) {
		result = fn(result, node);
	}
	return result;
}

/**
 * Used to find first parent that contains a specific attribute
 */
export function getFirstParentWithAttribute(node, attr) {
	return reduceAncestors(node, (acc, parent) => acc || (parent && attr in parent && parent));
}
