import moment from 'moment-timezone';
import fromPairs from 'lodash-es/fromPairs';
import mapValues from 'lodash-es/mapValues';
import map from 'lodash-es/map';
import isEmpty from 'lodash-es/isEmpty';
import { switchTimeFormat } from '../lib/util';

// Converts a string in the format of `257:false,266:true,1115:true`
// into an object.
export function normalizeFoldersExpanded(str = '') {
	if (!str) {
		return {};
	}
	return mapValues(
		fromPairs(
			str
				.split(',')
				.map(pair => {
					const matches = pair.match(/^([\w-]+):(true|false)$/);
					return matches ? [matches[1], matches[2]] : null;
				})
				.filter(Boolean)
		),
		v => v === 'true'
	);
}

export function serializeFoldersExpanded(obj = {}) {
	return map(obj, (v, k) => `${k}:${v}`).join(',');
}

/** Converts a string in the format
 * `1:N:0300:1100,2:Y:0300:1100,3:Y:0300:1100,4:Y:0300:1100,5:Y:0300:1100,6:Y:0300:1100,7:N:0300:1100`
 * into a JSON readable object.
 * @param {String} str
 * @returns {Object}
 */
export function soapTimeToJson(str) {
	const timeReg = /([0-9]):(Y|N):(\d{4}):(\d{4})/gm;
	let jsonResult = {};
	let match = [];
	try {
		while ((match = timeReg.exec(str)) != null) {
			jsonResult = {
				...jsonResult,
				[match[1]]: {
					enabled: match[2] === 'Y',
					start: moment(match[3], 'HHmm'),
					end: moment(match[4], 'HHmm')
				}
			};
		}

		return jsonResult;
	} catch (error) {
		console.error('Error while converting SOAP time to JSON: ', error.message);
	}
}

/**
 * Returns a string containing parsed hours of the day extracted from the JSON-formatted {@param jsonTime}
 * @param {{ ID: { enabled: String, start: String, end: String } }} jsonTime
 * @returns {String}
 */
export function jsonTimeToSoap(jsonTime) {
	try {
		let soapTime = '';

		Object.keys(jsonTime).forEach((dayNumber, index) => {
			soapTime = soapTime.concat(
				`${dayNumber}:${jsonTime[dayNumber].enabled ? 'Y' : 'N'}:${switchTimeFormat(
					jsonTime[dayNumber].start
				)}:${switchTimeFormat(jsonTime[dayNumber].end)}${
					index !== Object.keys(jsonTime).length - 1 ? ',' : ''
				}`
			);
		});
		return soapTime;
	} catch (error) {
		console.error('Error while converting JSON time to SOAP: ', error.message);
	}
}
// API returns empty lists as an array containing an empty object
export function normalizeList(arr = []) {
	return arr.filter(obj => !isEmpty(obj));
}
