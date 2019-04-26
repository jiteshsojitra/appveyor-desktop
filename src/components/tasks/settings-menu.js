import { h } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import { PRIORITY_VIEW, LIST_VIEW, DUE_DATE_VIEW, DONE_VIEW } from '../../constants/tasks';
import ActionMenuItem from '../action-menu-item';
import ActionMenuGroup from '../action-menu-group';
import { Icon } from '@zimbra/blocks';
import { callWith } from '../../lib/util';
import style from './style';

const VIEW_MODES = [PRIORITY_VIEW, LIST_VIEW, DUE_DATE_VIEW, DONE_VIEW];

export default function SettingsMenu({ activeView, setViewMode, openAddTask, createList, share }) {
	return (
		<Localizer>
			<ActionMenu
				anchor="end"
				corners="all"
				class={style.actionsMenuButton}
				popoverClass={style.actionsMenu}
				title={<Text id="tasks.SETTINGS" />}
				renderLabel={<Icon class={style.actionsMenuIcon} name="ellipsis-h" />}
			>
				<DropDownWrapper>
					<ActionMenuGroup>
						<ActionMenuItem onClick={openAddTask} disabled={activeView === 'DONE'}>
							<Text id="tasks.NEW_TASK" />
						</ActionMenuItem>
					</ActionMenuGroup>
					<ActionMenuGroup>
						{VIEW_MODES.map(viewMode => (
							<ActionMenuItem
								icon={activeView === viewMode && 'check'}
								onClick={callWith(setViewMode, viewMode)}
							>
								<Text id={`tasks.${viewMode}_VIEW`} />
							</ActionMenuItem>
						))}
					</ActionMenuGroup>
					<ActionMenuGroup>
						<ActionMenuItem onClick={createList}>
							<Text id="tasks.CREATE_LIST" />
						</ActionMenuItem>
					</ActionMenuGroup>
					<ActionMenuGroup>
						<ActionMenuItem onClick={share}>
							<Text id="tasks.SHARE" />
						</ActionMenuItem>
					</ActionMenuGroup>
				</DropDownWrapper>
			</ActionMenu>
		</Localizer>
	);
}
