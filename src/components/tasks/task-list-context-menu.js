import { h } from 'preact';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import ContextMenu from '../context-menu';
import { callWith } from '../../lib/util';
import { Text } from 'preact-i18n';

export default function TaskListContextMenu({ children, ...rest }) {
	return <ContextMenu menu={<TaskListContextMenuMenu {...rest} />}>{children}</ContextMenu>;
}

const TaskListContextMenuMenu = ({ onRename, onAddTask, onDelete }) => (
	<ActionMenuGroup>
		<ActionMenuItem onClick={callWith(onRename)} disabled={!onRename}>
			<Text id="tasks.contextMenu.renameTaskList" />
		</ActionMenuItem>
		<ActionMenuItem onClick={callWith(onAddTask)}>
			<Text id="tasks.NEW_TASK" />
		</ActionMenuItem>
		<ActionMenuItem onClick={callWith(onDelete)} disabled={!onDelete}>
			<Text id="tasks.contextMenu.deleteTaskList" />
		</ActionMenuItem>
	</ActionMenuGroup>
);
