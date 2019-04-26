import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import get from 'lodash-es/get';
import array from '@zimbra/util/src/array';
import moment from 'moment';
import { CALENDAR_REPEAT_FREQUENCY, weekDaySorter } from '../../constants/calendars';
import { withProps, branch, renderNothing } from 'recompose';

function getRecurrenceField(recurrence, field, newEvent) {
	return newEvent ? get(recurrence, `add.rule.${field}`) : get(recurrence, `add.0.rule.0.${field}`);
}

function fetchRecurrenceText({ recurrence, startTime, newEvent = false, ...rest }) {
	const freq = getRecurrenceField(recurrence, 'frequency', newEvent),
		days = array(
			getRecurrenceField(recurrence, newEvent ? 'byday.wkday' : 'byday.0.wkday', newEvent)
		).map(({ day }) => day),
		interval = getRecurrenceField(
			recurrence,
			newEvent ? 'interval.intervalCount' : 'interval.0.intervalCount',
			newEvent
		),
		count = getRecurrenceField(recurrence, newEvent ? 'count.number' : 'count.0.number', newEvent),
		endDate = getRecurrenceField(recurrence, newEvent ? 'until.date' : 'until.0.date', newEvent);

	if (!freq) {
		return;
	}
	const customRecurrenceObject = {},
		customRecurrenceString = [freq],
		numberOfDays = days.length;

	// Specify the interval of the event i.e Weekly/ Every 2 week.
	if (interval === 1) {
		freq !== CALENDAR_REPEAT_FREQUENCY.yearly && customRecurrenceString.push('one');
	} else {
		freq !== CALENDAR_REPEAT_FREQUENCY.yearly && customRecurrenceString.push('multiple');
		customRecurrenceObject.interval = interval;
	}

	if (freq === CALENDAR_REPEAT_FREQUENCY.weekly) {
		if (days.join(',') === 'MO,TU,WE,TH,FR') {
			// Display weekdays if all the weekdays are selected.
			customRecurrenceString.push('allWeek');
		} else if (numberOfDays) {
			// Display specific days selected.
			customRecurrenceObject.days = days
				.map(day =>
					moment()
						.day(weekDaySorter[day])
						.format('dddd')
				)
				.join(', ');
		} else {
			// Display weekly when no specific days are selected specifically.
			customRecurrenceString.push('noSpecificDay');
		}
	}

	if (freq === CALENDAR_REPEAT_FREQUENCY.yearly || freq === CALENDAR_REPEAT_FREQUENCY.monthly) {
		if (numberOfDays) {
			// Recurrence by weekday rule. Ex - Monthly on third thursday/ Annually on first tuesday of May
			customRecurrenceObject.order = rest['order' + Math.ceil(moment(startTime).date() / 7)];
			customRecurrenceObject.day = moment()
				.day(weekDaySorter[days[0]])
				.format('dddd');
			customRecurrenceObject.monthName =
				freq === CALENDAR_REPEAT_FREQUENCY.yearly &&
				moment()
					.month(
						Number(
							getRecurrenceField(
								recurrence,
								newEvent ? 'bymonth.monthList' : 'bymonth.0.monthList',
								newEvent
							)
						) - 1
					)
					.format('MMMM');
			customRecurrenceString.push('byWeekDayRule');
		} else {
			// Recurrence by date rule. Ex - Monthly on Day 22/ Annually on May 22
			customRecurrenceString.push('byDateRule');
			customRecurrenceObject.date = moment(startTime).format(
				freq === CALENDAR_REPEAT_FREQUENCY.yearly ? 'MMM D' : 'D'
			);
		}
	}
	if (count || endDate) {
		customRecurrenceString.push('endCondition');
		// Add end condition, either by the number of occurrences i.e. count or by endDate
		if (count) {
			customRecurrenceString.push('byCount');
			customRecurrenceObject.count = count;
		} else {
			customRecurrenceString.push('byDate');
			customRecurrenceObject.endDate = moment(endDate).format('MMM D, YYYY');
		}
	} else {
		customRecurrenceString.push('noEndCondition');
	}

	return {
		customRecurrenceString: customRecurrenceString.join('.'),
		customRecurrenceObject
	};
}
@withText({
	order1: 'calendar.dialogs.customRecurrence.repeatSection.weekOrder.first',
	order2: 'calendar.dialogs.customRecurrence.repeatSection.weekOrder.second',
	order3: 'calendar.dialogs.customRecurrence.repeatSection.weekOrder.third',
	order4: 'calendar.dialogs.customRecurrence.repeatSection.weekOrder.fourth',
	order5: 'calendar.dialogs.customRecurrence.repeatSection.weekOrder.last'
})
@branch(({ recurrence }) => !recurrence, renderNothing)
@withProps(props => fetchRecurrenceText(props))
export default class Recurrence extends Component {
	render({ customRecurrenceString, customRecurrenceObject }) {
		return (
			<Text
				id={`calendar.dialogs.customRecurrence.recurrence.${customRecurrenceString}`}
				fields={customRecurrenceObject}
			/>
		);
	}
}
