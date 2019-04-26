import { h } from 'preact';
import { colorForCalendar } from '../../../utils/calendar';

export default function CalendarOptionItem({ calendar, style }) {
	return (
		<div class={style.calendarOptionItem}>
			<span class={style.calendarColor} style={{ backgroundColor: colorForCalendar(calendar) }} />
			<span class={style.calendarText}>{calendar.name}</span>
		</div>
	);
}
