import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import moment from 'moment';
import isToday from 'date-fns/is_today';
import isYesterday from 'date-fns/is_yesterday';
import isSameYear from 'date-fns/is_same_year';

@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';

	return {
		formatLT: `${timeFormats}.longDateFormat.LT`,
		formatDateMediumDayShort: 'timeFormats.dateFormats.formatDateMediumDayShort',
		formatMonthDayMedium: 'timeFormats.dateFormats.formatMonthDayMedium'
	};
})
export default class SentTimeFormat extends Component {
	render({ date, formatLT, formatMonthDayMedium, formatDateMediumDayShort }) {
		date = date instanceof Date ? date : new Date(date);
		return isToday(date) ? (
			moment(date).format(formatLT)
		) : isYesterday(date) ? (
			<Text id="dates.yesterday" />
		) : isSameYear(new Date(), date) ? (
			moment(date).format(formatMonthDayMedium)
		) : (
			moment(date).format(formatDateMediumDayShort)
		);
	}
}
