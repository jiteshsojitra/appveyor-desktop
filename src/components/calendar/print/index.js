import { h, Component } from 'preact';
import BigCalendar from 'react-big-calendar';
import moment from 'moment';
import get from 'lodash/get';
import { withText } from 'preact-i18n';
import { withProps } from 'recompose';
import { graphql } from 'react-apollo';
import CalendarsAndAppointmentsQuery from '../../../graphql/queries/calendar/calendars-and-appointments.graphql';
import AccountInfoQuery from '../../../graphql/queries/preferences/account-info.graphql';
import withMediaQuery from '../../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../../constants/breakpoints';
import { notify as notifyActionCreator } from '../../../store/notifications/actions';
import { getParsedSearch } from '../../../store/url/selectors';
import { VIEW_AGENDA, VIEW_DAY, VIEW_WEEK, VIEW_WORK_WEEK, VIEW_MONTH } from '../constants';
import { switchTimeFormat, convertTo24Format } from '../../../lib/util';
import { getEventProps } from '../event';
import startOfDay from 'date-fns/start_of_day';
import startOfWeek from 'date-fns/start_of_week';
import startOfMonth from 'date-fns/start_of_month';
import endOfMonth from 'date-fns/end_of_month';
import addMilliseconds from 'date-fns/add_milliseconds';
import { PREF_TO_VIEW, TIMES } from '../../../constants/calendars';
import * as calendarActionCreators from '../../../store/calendar/actions';
import cx from 'classnames';

import {
	colorForCalendar,
	isParticipatingInEvent,
	filterNonEditableCalendars,
	getView,
	getWorkingHours,
	getDOW
} from '../../../utils/calendar';
import flatMap from 'lodash/flatMap';

import { connect } from 'preact-redux';
import { PrintCalendarHeader } from './header';

import style from './style';

BigCalendar.setLocalizer(BigCalendar.momentLocalizer(moment));

const VIEWS = {
	agenda: true,
	day: true,
	week: true,
	work_week: true,
	month: true
};

@withText({
	eventNoTitle: 'calendar.event_no_title',
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';

	return {
		formatLT: `${timeFormats}.longDateFormat.LT`,
		formatHour: `${timeFormats}.formatHour`,
		format24HourMinute: 'timeFormats.format24hr.formatHourMinute',
		formatDayLong: 'timeFormats.dateFormats.formatDayLong',
		formatDateYearLong: 'timeFormats.dateFormats.formatDateYearLong',
		formatMonthDayLong: 'timeFormats.dateFormats.formatMonthDayLong',
		formatDateLongMonthMedium: 'timeFormats.dateFormats.formatDateLongMonthMedium',
		formatDayYearLong: 'timeFormats.dateFormats.formatDayYearLong',
		formatMonthYearLong: 'timeFormats.dateFormats.formatMonthYearLong'
	};
})
@withProps(
	({
		formatLT,
		formatHour,
		formatDateYearLong,
		formatMonthDayLong,
		formatDayLong,
		formatDateLongMonthMedium,
		formatDayYearLong,
		formatMonthYearLong
	}) => ({
		FORMATS: {
			selectRangeFormat: ({ start, end }) =>
				`${moment(start).format(formatLT)} - ${moment(end).format(formatLT)}`,
			eventTimeRangeFormat: () => null,
			timeGutterFormat: date => moment(date).format(formatHour),
			dayFormat: date => moment(date).format(formatDayLong),
			dayHeaderFormat: date => moment(date).format(formatDateYearLong),
			dayRangeHeaderFormat: ({ start, end }) =>
				`${moment(start).format(formatMonthDayLong)} - ${moment(end).format(
					start.getMonth() !== end.getMonth() ? formatDateLongMonthMedium : formatDayYearLong
				)}`,
			agendaHeaderFormat: (date, culture, localizer) =>
				localizer.format(date, formatMonthYearLong, culture)
		}
	})
)
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@connect(state => ({
	searchQuery: getParsedSearch(state)
}))
@connect(
	({ calendar = {} }) => ({
		date: calendar.date,
		activeModal: calendar.activeModal
	}),
	{
		setDate: calendarActionCreators.setDate,
		toggleModal: calendarActionCreators.toggleModal,
		notify: notifyActionCreator
	}
)
@graphql(AccountInfoQuery, {
	name: 'accountInfoData'
})
@withProps(({ matchesScreenMd, accountInfoData }) => {
	const preferences = get(accountInfoData, 'accountInfo.prefs');
	let view = getView({
		preferences
	});

	if (!matchesScreenMd && view === VIEW_WEEK) {
		view = VIEW_DAY;
	}

	return {
		preferencesData: {
			preferences
		},
		view
	};
})
@graphql(CalendarsAndAppointmentsQuery, {
	props: ({ data: { getFolder = {}, ...restData } }) => {
		const calendars = [
			...(get(getFolder, 'folders.0.folders') || []),
			...(get(getFolder, 'folders.0.linkedFolders') || [])
		];

		return {
			calendarsData: {
				...restData,
				calendars
			},
			calendarsToSelect: filterNonEditableCalendars(calendars)
		};
	},
	options: ({ preferencesData, view, searchQuery }) => {
		if (!preferencesData.preferences) {
			return { skip: true };
		}

		const dayOfTheWeek = getDOW(preferencesData);

		moment.locale(moment.locale(), {
			week: {
				dow: dayOfTheWeek
			}
		});

		let start = new Date(+searchQuery.start);
		let end = new Date(+searchQuery.end);

		if (view === VIEW_MONTH || view === VIEW_AGENDA) {
			start = startOfMonth(start);
			end = endOfMonth(end);
		} else if (view === VIEW_WEEK || view === VIEW_WORK_WEEK) {
			start = startOfWeek(start);
		} else if (view === VIEW_DAY) {
			start = startOfDay(start);
		}

		return {
			variables: {
				start: start.getTime() - TIMES[view],
				end: end || start.getTime() + TIMES[view] * 3 // @TODO this should work like start's offset
			}
		};
	}
})
export default class CalendarPrintPreview extends Component {
	state = {
		openedPrintPreview: false
	};
	getVisibleAppointmentsData = displayedCalendars => {
		const { calendarsData } = this.props;
		const checkedCalendars =
			calendarsData && calendarsData.calendars
				? calendarsData.calendars.filter(calendar => displayedCalendars.indexOf(calendar.id) >= 0)
				: [];

		return flatMap(checkedCalendars, c =>
			c.appointments
				? c.appointments.appointments.map(appointment => ({
						...appointment,
						parentFolderName: c.name,
						color: colorForCalendar(c),
						...(c.permissions && { permissions: c.permissions })
				  }))
				: []
		);
	};

	getEventName = event => event.name || this.props.eventNoTitle;

	getSlotProps = time => {
		const { formatLT, format24HourMinute, preferencesData } = this.props;
		const hoursObject = getWorkingHours(preferencesData);
		const businessHoursStart = parseInt(
				switchTimeFormat(
					moment(hoursObject[1].start).format(formatLT),
					formatLT,
					format24HourMinute
				),
				10
			),
			businessHoursEnd = parseInt(
				switchTimeFormat(moment(hoursObject[1].end).format(formatLT), formatLT, format24HourMinute),
				10
			),
			hour = new Date(time).getHours(),
			className =
				hour >= businessHoursStart && hour <= businessHoursEnd
					? style.businessHours
					: style.afterHours;
		return { className };
	};

	render({ calendarsData, accountInfoData, searchQuery, FORMATS }, {}) {
		const email = accountInfoData ? accountInfoData.accountInfo.name : '';
		const displayedCalendars = searchQuery.calendars.split(',');
		const appointments = this.getVisibleAppointmentsData(displayedCalendars);
		const displayedCalendarsData =
			calendarsData && calendarsData.calendars
				? calendarsData.calendars.filter(calendar => displayedCalendars.indexOf(calendar.id) >= 0)
				: [];
		const events = flatMap(appointments, appointment =>
			appointment.instances
				? appointment.instances.map(instance =>
						// Use exception data if available
						instance.isException
							? {
									...instance,
									date: new Date(instance.start),
									color: appointment.color,
									...(appointment.permissions && { permissions: appointment.permissions }),
									folderId: appointment.folderId,
									parentFolderName: appointment.parentFolderName
							  }
							: {
									...appointment,
									date: new Date(instance.start),
									utcRecurrenceId: instance.utcRecurrenceId
							  }
				  )
				: {
						...appointment,
						date: new Date(appointment.date)
				  }
		).map(event => ({
			...event,
			start: event.date,
			end: addMilliseconds(event.date, event.duration),
			title: event.name || ''
		}));

		const defaultDate = new Date(+searchQuery.start);

		const startDates = [];
		const endDate = new Date(+searchQuery.end);
		let currentDate = defaultDate;

		switch (searchQuery.printView) {
			case PREF_TO_VIEW.week:
			case PREF_TO_VIEW.workWeek:
				while (currentDate <= endDate) {
					startDates.push(new Date(currentDate));
					currentDate.setDate(currentDate.getDate() + 7);
				}
				if (
					moment(startDates[startDates.length - 1].getTime()).format('w') !==
					moment(endDate.getTime()).format('w')
				)
					startDates.push(new Date(currentDate));
				break;
			case PREF_TO_VIEW.month:
			case PREF_TO_VIEW.list:
				while (currentDate <= endDate) {
					startDates.push(new Date(currentDate));
					const tmp = moment(currentDate)
						.add(1, 'months')
						.format();
					currentDate = new Date(tmp);
				}
				if (startDates[startDates.length - 1].getMonth() !== endDate.getMonth())
					startDates.push(new Date(currentDate));
				break;
			case PREF_TO_VIEW.day:
				while (currentDate <= endDate) {
					startDates.push(new Date(currentDate));
					currentDate.setDate(currentDate.getDate() + 1);
				}
				break;
		}
		const displayedEvents = events.filter(isParticipatingInEvent);

		const timeValues = {};
		if (
			searchQuery.printView === PREF_TO_VIEW.workWeek ||
			searchQuery.printView === PREF_TO_VIEW.week ||
			searchQuery.printView === PREF_TO_VIEW.day
		) {
			const extra = moment().format('YYYY-MM-DD') + ' ';
			const startTime = new Date(extra + convertTo24Format(searchQuery.hoursFrom));
			const endTime = new Date(extra + convertTo24Format(searchQuery.hoursTo));
			endTime.setTime(endTime.getTime() + 60000);
			timeValues.min = startTime;
			timeValues.max = endTime;
		}

		if (displayedEvents.length > 0 && !this.state.openedPrintPreview) {
			setTimeout(() => window.print(), 1500);
			this.setState({ openedPrintPreview: true });
		}
		return (
			<div class={cx(style.main)}>
				<div class={cx(style.calendar, style[searchQuery.printView + 'View'])}>
					{startDates.map((date, index) => (
						<div class={cx(style.calendarContainer)}>
							<PrintCalendarHeader
								view={searchQuery.printView}
								date={date}
								email={email}
								calendarsData={displayedCalendarsData}
								showPrintHeader={index === 0}
								showMiniCalendar={index === 0 && searchQuery.includeMiniCalendar}
							/>
							<BigCalendar
								className={style.calendarInner}
								formats={FORMATS}
								views={VIEWS}
								{...timeValues}
								elementProps={{ className: style.calendarInner }}
								eventPropGetter={getEventProps}
								slotPropGetter={this.getSlotProps}
								defaultView={searchQuery.printView}
								defaultDate={date}
								events={displayedEvents}
								titleAccessor={this.getEventName}
								tooltipAccessor={this.getEventName}
								popup={false}
								toolbar={false}
								selectable="ignoreEvents"
							/>
							{searchQuery.printOneCalendarPerPage && (
								<div class={cx(searchQuery.printOneCalendarPerPage && style.addPageBreak)} />
							)}
						</div>
					))}
				</div>
			</div>
		);
	}
}
