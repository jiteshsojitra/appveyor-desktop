import moment from 'moment';

const LONG = 'ddd[,] MMM D LT',
	SHORT = 'LT';

/**
 * Format two dates with context around how to format each part
 * of the range.
 */
export function formatDayRange(start, end) {
	const s = moment(start);
	const e = moment(end);

	if (s.isSame(end, 'day')) {
		return `${s.format(LONG)} - ${e.format(SHORT)}`;
	}

	return `${s.format(LONG)} - ${e.format(LONG)}`;
}
