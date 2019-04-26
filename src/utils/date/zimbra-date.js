import moment from 'moment';

/**
 * Parse or format zimbra's expected datetime format
 */

export function parse(dateString) {
	return moment(dateString, 'YYYYMMDDhhmmssZ').toDate();
}

export function format(dateObj) {
	return `${moment.utc(dateObj).format('YYYYMMDDhhmmss')}Z`;
}
