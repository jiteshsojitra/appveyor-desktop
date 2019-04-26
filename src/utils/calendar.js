import moment from 'moment';
import differenceInDays from 'date-fns/difference_in_days';
import startOfDay from 'date-fns/start_of_day';
import isSameWeek from 'date-fns/is_same_week';
import isSameMonth from 'date-fns/is_same_month';
import isSameYear from 'date-fns/is_same_year';
import { USER_FOLDER_IDS } from '../constants';
import { soapTimeToJson } from '../utils/prefs';
import {
	CALENDAR_TYPE,
	CALENDAR_IDS,
	PARTICIPATION_STATUS,
	PREF_TO_VIEW
} from '../constants/calendars';
import COLORS from '../constants/colors';

export function calendarDateFormat(
	date,
	formats = {
		sameDay: '[Today]',
		nextDay: '[Tomorrow]',
		nextWeek: 'dddd',
		lastDay: '[Yesterday]',
		lastWeek: '[Last] dddd',
		sameElse: 'DD/MM/YYYY'
	}
) {
	const now = Date.now();
	const diff = differenceInDays(startOfDay(date), startOfDay(now));

	// Logic from moment...
	const formatStr =
		diff < -6 && isSameMonth(date, now)
			? formats.sameMonth
			: diff < -6 && isSameYear(date, now)
			? formats.sameYear
			: diff < -6
			? formats.sameElse
			: diff < -1 && isSameWeek(date, now)
			? formats.sameWeek
			: diff < -1
			? formats.lastWeek
			: diff < 0
			? formats.lastDay
			: diff < 1
			? formats.sameDay
			: diff < 2
			? formats.nextDay
			: diff < 7
			? formats.nextWeek
			: formats.sameElse;

	return moment(date).format(formatStr || formats.sameElse);
}

// Is this a holiday calendar?
export const isHolidayCalendar = calendar =>
	!calendar.owner && calendar.url && /holiday/i.test(calendar.url);

// Is this a calendar owned by the user?
export const isOwnCalendar = calendar => !calendar.owner && !isHolidayCalendar(calendar);

// Is this an external calendar that has been linked
// with this user?
export const isOtherCalendar = calendar => calendar.owner && !isOwnCalendar(calendar);

export const calendarType = calendar =>
	isOtherCalendar(calendar)
		? CALENDAR_TYPE.other
		: isOwnCalendar(calendar)
		? CALENDAR_TYPE.own
		: isHolidayCalendar(calendar)
		? CALENDAR_TYPE.holiday
		: null;

export const prepareCalendarList = (folders, linkedFolders) => {
	const calendars = [...(folders || []), ...(linkedFolders || [])].filter(
		cl => cl.id !== String(USER_FOLDER_IDS.TRASH)
	);

	const calendarSections = {};

	Object.keys(CALENDAR_TYPE).forEach(key => (calendarSections[key] = []));

	calendars.forEach(cal => {
		const sectionsIdx = calendarType(cal);
		if (sectionsIdx) {
			calendarSections[sectionsIdx].push(cal);
		}
	});
	return {
		calendars,
		calendarSections
	};
};

export const rearrangePrimaryCalendars = items =>
	items.reduce((sortedItems, item) => {
		item.id === CALENDAR_IDS[CALENDAR_TYPE.own].DEFAULT
			? sortedItems.unshift(item)
			: sortedItems.push(item);
		return sortedItems;
	}, []);

export const colorForCalendar = calendar => COLORS[calendar.color || 0];

export const filterNonEditableCalendars = calendars => {
	const { calendarSections } = prepareCalendarList(calendars);
	// remove the non-editable calendars from the others calendar
	calendarSections[CALENDAR_TYPE.other] = calendarSections[CALENDAR_TYPE.other].filter(
		otherCal => otherCal.permissions && otherCal.permissions.toLowerCase().indexOf('w') > -1
	);
	const primaryCalendars = calendarSections[CALENDAR_TYPE.own].concat(
		calendarSections[CALENDAR_TYPE.other]
	);
	return rearrangePrimaryCalendars(primaryCalendars);
};

export const filterNonInsertableCalendars = calendars =>
	calendars.filter(calendar => !calendar.permissions || calendar.permissions.includes('i'));

export function isParticipatingInEvent({ participationStatus }) {
	return !~[PARTICIPATION_STATUS.declined].indexOf(participationStatus);
}

export function getView({ preferences }) {
	return (
		(preferences && PREF_TO_VIEW[preferences.zimbraPrefCalendarInitialView]) || PREF_TO_VIEW.month
	);
}

export function getWorkingHours({ preferences }) {
	return preferences && soapTimeToJson(preferences.zimbraPrefCalendarWorkingHours);
}

/**
 * returns the zimbra calendar first day of the week pref as a number
 * @param {Object} preferences
 * @returns {number}            Day of the Week as a number
 */

export function getDOW({ preferences }) {
	return preferences && parseInt(preferences.zimbraPrefCalendarFirstDayOfWeek, 10);
}
