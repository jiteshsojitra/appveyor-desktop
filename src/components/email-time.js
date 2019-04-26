import { h, Component } from 'preact';
import moment from 'moment';
import { withText } from 'preact-i18n';

const DAY = 24 * 60 * 60 * 1000;

@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';

	return {
		formatLT: `${timeFormats}.longDateFormat.LT`,
		formatcustomDateLong: 'timeFormats.dateFormats.formatcustomDateLong',
		formatMonthDayMedium: 'timeFormats.dateFormats.formatMonthDayMedium'
	};
})
export default class EmailTime extends Component {
	formatTime = date => moment(date).format(this.props.formatLT);
	formatDate = date => moment(date).format(this.props.formatcustomDateLong);
	formatDateThisYear = date => moment(date).format(this.props.formatMonthDayMedium);

	emailTime(date) {
		const now = new Date(),
			nowDay = this.formatDate(now),
			time = this.formatTime(date),
			day = this.formatDate(date);
		if (nowDay === day || now.getTime() - date.getTime() < DAY) return time;
		if (now.getFullYear() === date.getFullYear()) return this.formatDateThisYear(date);
		return this.formatDate(date);
	}

	render({ time, ...props }) {
		const date = new Date(time);
		return (
			<time {...props} title={date}>
				{this.emailTime(date)}
			</time>
		);
	}
}
