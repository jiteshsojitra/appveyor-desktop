import { h } from 'preact';

import Toolbar from '../toolbar';
import ToolbarSidebarButton from '../toolbar/sidebar-button';
import ToolbarActionButton from '../toolbar/action-button';
import ToolbarTitle from '../toolbar/title';
import { SearchEasingButton } from '../search-easing';

import s from './style.less';

export default function CalendarSectionToolbar({ onCreateNewEvent, openSearchBar }) {
	return (
		<Toolbar>
			<ToolbarSidebarButton className={s.actionButton} />
			<ToolbarTitle text="calendar.title" />
			<div class={s.actionButtons}>
				<SearchEasingButton open={openSearchBar} />

				<ToolbarActionButton onClick={onCreateNewEvent} icon="plus" className={s.composeButton} />
			</div>
		</Toolbar>
	);
}
