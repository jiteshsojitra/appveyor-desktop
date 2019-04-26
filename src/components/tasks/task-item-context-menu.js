import { h, Component } from 'preact';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import { TaskQuery } from '../../graphql/queries/tasks.graphql';
import { graphql } from 'react-apollo';
import ContextMenu from '../context-menu';
import { callWith } from '../../lib/util';
import { isTaskDone, isTaskOverdue, postponeTask, getDueDate } from '../../utils/tasks';
import { Text } from 'preact-i18n';

export default function TaskItemContextMenu({
	children,
	onEdit,
	onDelete,
	onChange,
	onToggleDone,
	disabled,
	task
}) {
	return (
		<ContextMenu
			disabled={disabled}
			menu={
				<TaskItemContextMenuMenu
					onChange={onChange}
					onToggleDone={onToggleDone}
					onEdit={onEdit}
					onDelete={onDelete}
					task={task}
				/>
			}
		>
			{children}
		</ContextMenu>
	);
}

//Do this to prefetch the task so that the Edit data is ready if they click Edit
@graphql(TaskQuery, {
	options: ({ task }) => ({
		variables: {
			id: task.inviteId
		}
	})
})
class TaskItemContextMenuMenu extends Component {
	render({ onEdit, onDelete, onChange, onToggleDone, task }) {
		const isDone = isTaskDone(task);
		const isOverdue = isTaskOverdue(task);
		// Create a task postponed one day from the due date, or one day from today
		const postponedTask = postponeTask(task, isOverdue ? Date.now() : undefined);

		return (
			<ActionMenuGroup>
				<ActionMenuItem onClick={callWith(onEdit, task.inviteId)}>
					<Text id="tasks.contextMenu.editTask" />
				</ActionMenuItem>
				<ActionMenuItem
					onClick={callWith(onChange, postponedTask)}
					disabled={!getDueDate(task) || isDone}
				>
					<Text id={`tasks.contextMenu.postpone${isOverdue ? 'UntilTomorrow' : 'OneDay'}`} />
				</ActionMenuItem>
				<ActionMenuItem onClick={callWith(onToggleDone, task)}>
					<Text id={`tasks.contextMenu.mark${isDone ? 'Not' : ''}Done`} />
				</ActionMenuItem>
				<ActionMenuItem onClick={callWith(onDelete, task)}>
					<Text id="tasks.contextMenu.deleteTask" />
				</ActionMenuItem>
			</ActionMenuGroup>
		);
	}
}
