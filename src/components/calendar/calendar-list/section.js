import { h, Component } from 'preact';
import { Icon } from '@zimbra/blocks';
import { CALENDAR_TYPE } from '../../../constants/calendars';

import style from './style.less';
import { rearrangePrimaryCalendars } from '../../../utils/calendar';

export default class CalendarListSectionItem extends Component {
	state = {
		expanded: this.props.initialExpanded
	};

	handleToggleExpanded = () => {
		this.setState({ expanded: !this.state.expanded });
	};

	render(
		{ type, items, label, renderItem, renderAction, showGroupActions, matchesScreenMd },
		{ expanded }
	) {
		const listItems = type === CALENDAR_TYPE.own ? rearrangePrimaryCalendars(items) : [...items];

		return (
			<li class={style.group}>
				{matchesScreenMd && (
					<div class={style.groupHeader}>
						<div class={style.groupToggle} onClick={this.handleToggleExpanded}>
							<Icon name={expanded ? 'angle-down' : 'angle-right'} size="xs" />
						</div>
						<div class={style.groupName}>{label}</div>
						{showGroupActions && renderAction()}
					</div>
				)}

				{(!matchesScreenMd || expanded) && <ul class={style.list}>{listItems.map(renderItem)}</ul>}
			</li>
		);
	}
}
