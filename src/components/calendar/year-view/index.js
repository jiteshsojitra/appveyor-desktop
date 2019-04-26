import { h, Component } from 'preact';
import BigCalendar from 'react-big-calendar';
import dates from 'react-big-calendar/lib/utils/dates';
import moment from 'moment';
import { callWith } from '../../../lib/util';
import NakedButton from '../../naked-button';
import startOfYear from 'date-fns/start_of_year';
import setMonth from 'date-fns/set_month';
import isToday from 'date-fns/is_today';
import isSameMonth from 'date-fns/is_same_month';
import isSameDay from 'date-fns/is_same_day';
import startOfWeek from 'date-fns/start_of_week';
import endOfWeek from 'date-fns/end_of_week';
import endOfMonth from 'date-fns/end_of_month';
import eachDay from 'date-fns/each_day';
import { VIEW_MONTH } from '../constants';
import style from './style';
import cx from 'classnames';
import { withText } from 'preact-i18n';

export default class YearView extends Component {
	static title(date) {
		return withText('timeFormats.dateFormats.formatDayLong')(props =>
			moment(date).format(props.formatDayLong)
		);
	}

	static navigate(date, action) {
		switch (action) {
			case BigCalendar.Navigate.PREVIOUS:
				return dates.add(date, -1, 'year');

			case BigCalendar.Navigate.NEXT:
				return dates.add(date, 1, 'year');

			default:
				return date;
		}
	}

	static range(date) {
		const start = dates.startOf(date, 'year'),
			end = dates.endOf(date, 'year');
		return { start, end };
	}

	navigate = date => {
		const { getDrilldownView, onView, onNavigate } = this.props;
		const view = (date && date.view) || getDrilldownView(date);
		onNavigate(null, (date && date.date) || date);
		onView(view);
	};

	renderMonth = start => <Month start={start} date={this.props.date} onNavigate={this.navigate} />;

	render({ date }) {
		const start = startOfYear(date);
		const months = [];
		for (let month = 0; month < 12; month++) {
			months.push(setMonth(start, month));
		}

		return <div class={style.year}>{months.map(this.renderMonth)}</div>;
	}
}

@withText({
	foramtWeekDayMedium: 'timeFormats.dateFormats.foramtWeekDayMedium',
	formatDateLongMonthMedium: 'timeFormats.dateFormats.formatDateLongMonthMedium',
	formatMonthYearMedium: 'timeFormats.dateFormats.formatMonthYearMedium'
})
class Month extends Component {
	renderDayName = date => (
		<span class={cx(style.day, style.dayName)}>
			{moment(date).format(this.props.foramtWeekDayMedium)[0]}
		</span>
	);

	renderDay = date => {
		const { formatDateLongMonthMedium, start, date: propsDate, onNavigate } = this.props;
		return (
			<NakedButton
				class={cx(
					style.day,
					isToday(date) && style.today,
					isSameMonth(date, start)
						? isSameDay(date, propsDate) && style.current
						: style.outsideOfMonth
				)}
				onClick={callWith(onNavigate, date)}
				title={moment(date).format(formatDateLongMonthMedium)}
			>
				{date.getDate()}
			</NakedButton>
		);
	};

	render({ start, onNavigate, formatMonthYearMedium }) {
		const days = eachDay(startOfWeek(start), endOfWeek(endOfMonth(start)));

		return (
			<div class={style.month}>
				<h3
					class={style.heading}
					tabIndex="0"
					onClick={callWith(onNavigate, { view: VIEW_MONTH, date: start })}
				>
					{moment(start).format(formatMonthYearMedium)}
				</h3>
				{days.slice(0, 7).map(this.renderDayName)}
				{days.map(this.renderDay)}
			</div>
		);
	}
}
