import moment from 'moment';
import get from 'lodash/get';

export function adjustTimeToLocalTimeZone(
	{ start, end, allDay },
	displayFormat,
	formatLongHourLT,
	formatMonthLong,
	formatDateLong,
	formatDateMedium
) {
	const startUtc = get(start, '0.utc');
	const endUtc = get(end, '0.utc');
	const startDateString = get(start, '0.date');
	const endDateString = get(end, '0.date');
	let startDate;
	let endDate;

	if (startUtc && endUtc) {
		startDate = moment.utc(startUtc).toDate();
		endDate = moment.utc(endUtc).toDate();
	} else {
		startDate = moment.utc(startDateString).toDate();
		endDate = moment.utc(endDateString).toDate();
	}

	const startMoment = moment(startDate);
	const endMoment = moment(endDate);

	const endDateSeconds = endMoment.seconds();

	endDate = endDateSeconds >= 30 ? endMoment.add('seconds', 60 - endDateSeconds) : endDate;

	const dateFormatLeftHandSide = startMoment.format(displayFormat);
	const dateFormatRightHandSide = startMoment.isSame(endMoment, 'day')
		? endMoment.format(formatLongHourLT)
		: endMoment.format(displayFormat); // LT will display hh:mm A
	const dateFormatAllDay =
		displayFormat.indexOf(formatMonthLong) !== -1
			? startMoment.format(formatDateLong)
			: startMoment.format(formatDateMedium); // ll will display the short date (Feb 13, 2019) and LL will display full date (February 13, 2019).

	return allDay ? dateFormatAllDay : `${dateFormatLeftHandSide} to ${dateFormatRightHandSide}`;
}
