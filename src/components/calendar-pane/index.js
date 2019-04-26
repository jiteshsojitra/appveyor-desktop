import { h } from 'preact';
import AppointmentList from '../appointment-list';

import s from './style.less';
import { isArray } from 'util';
import ZimletSlot from '../zimlet-slot';

const CalendarPane = ({ calendars, items, more, pending, onItemClick, visibleResults }) => {
	const listItems = isArray(items.appointments) || isArray(items.task) || isArray(items);
	return (
		<div class={s.calendarPane}>
			<ZimletSlot name="top-mail-ad-item" props class={s.listTopper} />
			{listItems ? (
				<AppointmentList
					calendars={calendars}
					handleItemClick={onItemClick}
					items={{
						more,
						pending,
						data: items
					}}
					visibleResults={visibleResults}
				/>
			) : null}
		</div>
	);
};

export default CalendarPane;
