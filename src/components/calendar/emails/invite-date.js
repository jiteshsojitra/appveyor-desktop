import moment from 'moment';
import isSameDay from 'date-fns/is_same_day';

export default function inviteDate(start, end) {
	const startDate = moment(start),
		endDate = moment(end),
		sameDay = isSameDay(startDate, endDate),
		separator = sameDay ? ' to ' : ' - ';

	return `${startDate.format('LLLL')}${separator}${endDate.format(sameDay ? 'LT' : 'LLLL')}`;
}
