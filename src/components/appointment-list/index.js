import { h, Component } from 'preact';
import cx from 'classnames';
import cloneDeep from 'lodash-es/cloneDeep';
import { isArray } from 'util';
import AppointmentListItem from '../appointment-list-item';

import s from './style.less';

export default class AppointmentList extends Component {
	listRef = c => {
		this.list = c;
	};

	groupItems = () => {
		const { items, visibleResults } = this.props;

		const itemsClone = cloneDeep(items);

		if (itemsClone.data.length) {
			const oldItems = cloneDeep(itemsClone.data);
			itemsClone.data = {
				appointments: [].concat(oldItems),
				task: []
			};
		}

		let results = [];

		if (visibleResults === 'Events' || visibleResults === 'Both') {
			results = results.concat(...itemsClone.data.appointments);
		}
		if (visibleResults === 'Tasks' || visibleResults === 'Both') {
			results = results.concat(...itemsClone.data.task);
		}

		return results;
	};

	render = () => {
		const { items, calendars, handleItemClick, selectedIds, viewingId, ...rest } = this.props;

		return (
			<div
				{...rest}
				class={cx(s.scrollableList, rest.class)}
				ref={this.listRef}
				tabIndex="0"
				scrollbar
			>
				{this.groupItems().map(
					i =>
						isArray(i.instances || i.inst) &&
						(i.instances || i.inst).map(instance => (
							<AppointmentListItem
								{...rest}
								key={i.id}
								item={i}
								calendar={i.folderId && calendars[i.folderId.toString()]}
								isTask={!instance.start}
								startDate={
									instance.start ? instance.start : instance.dueDate ? instance.dueDate : i.date
								}
								selectedIds={selectedIds}
								onClick={handleItemClick}
							/>
						))
				)}
			</div>
		);
	};
}
