import { h } from 'preact';

import Toolbar from '../toolbar';
import ToolbarSidebarButton from '../toolbar/sidebar-button';
import ToolbarActionButton from '../toolbar/action-button';
import ToolbarTitle from '../toolbar/title';
import { SearchEasingButton } from '../search-easing';

import s from './style.less';

export default function ContactsToolbar({
	onCompose,
	searchInline,
	isOffline,
	multipleContactToolBar
}) {
	return (
		<Toolbar>
			<ToolbarSidebarButton className={s.actionButton} />
			<ToolbarTitle text="contacts.title" />
			{multipleContactToolBar || (
				<div class={s.actionButtons}>
					<SearchEasingButton />
					<ToolbarActionButton
						onClick={onCompose}
						localSearch={searchInline}
						icon="plus"
						className={s.composeButton}
						isOffline={isOffline}
					/>
				</div>
			)}
		</Toolbar>
	);
}
