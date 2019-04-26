import { h } from 'preact';
import startOfWeek from 'date-fns/start_of_week';
import endOfWeek from 'date-fns/end_of_week';
import style from './style';
import cx from 'classnames';
import { PREF_TO_VIEW } from '../../../constants/calendars';
import { colorForCalendar } from '../../../utils/calendar';
import MiniCal from '../mini-cal';
import moment from 'moment-timezone';
import { withText } from 'preact-i18n';

@withText({
	formatDateLongMonthMedium: 'timeFormats.dateFormats.formatDateLongMonthMedium',
	foramtWeekDayLong: 'timeFormats.dateFormats.foramtWeekDayLong',
	formatDate: 'timeFormats.dateFormats.formatDate',
	customformatMonthDayLong: 'timeFormats.dateFormats.customformatMonthDayLong',
	formatDay: 'timeFormats.dateFormats.formatDay',
	formatYearLong: 'timeFormats.dateFormats.formatYearLong',
	formatMonthYearLong: 'timeFormats.dateFormats.formatMonthYearLong'
})
export class PrintCalendarHeader {
	render({
		email,
		calendarsData,
		date,
		showPrintHeader,
		showMiniCalendar,
		view,
		formatYearLong,
		formatDateLongMonthMedium,
		foramtWeekDayLong,
		formatDate,
		customformatMonthDayLong,
		formatDay,
		formatMonthYearLong
	}) {
		const currentDate = moment(new Date());
		const calendarDate = moment(date);

		const start = moment(startOfWeek(calendarDate));
		const end = moment(endOfWeek(calendarDate));

		return (
			<div class={cx(style.header)}>
				{showPrintHeader && (
					<div class={cx(style.headerInfo)}>
						<div>{moment(currentDate).format(formatDate)}</div>
						<div>{email}</div>
					</div>
				)}
				{view === PREF_TO_VIEW.week || view === PREF_TO_VIEW.workWeek ? (
					<div class={cx(style.headerDate)}>
						{calendarDate.format(foramtWeekDayLong) +
							', ' +
							start.format(customformatMonthDayLong) +
							'-' +
							end.format(formatDay) +
							', ' +
							start.format(formatYearLong)}
					</div>
				) : view === PREF_TO_VIEW.month || view === PREF_TO_VIEW.list ? (
					<div class={cx(style.headerDate)}>{calendarDate.format(formatMonthYearLong)}</div>
				) : (
					<div class={cx(style.headerDate)}>{calendarDate.format(formatDateLongMonthMedium)}</div>
				)}
				<div>
					{calendarsData &&
						calendarsData.map(c => (
							<div class={cx(style.calendarColorsLegend)}>
								<div
									style={{
										'background-color': colorForCalendar(c)
									}}
								/>
								<span>{c.name}</span>
							</div>
						))}
				</div>
				{showMiniCalendar && (
					<MiniCal
						selectionFollowsCursor
						calendarView={'week'}
						date={calendarDate}
						disabled
						class={style.minical}
					/>
				)}
			</div>
		);
	}
}
