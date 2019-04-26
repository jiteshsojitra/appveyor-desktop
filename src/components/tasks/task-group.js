import { h, Component } from 'preact';
import { Text, Localizer, withText } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import withCreateTask from '../../graphql-decorators/tasks/create-task';
import FolderInput from '../folder-input';
import ActionButton from '../action-button';
import TaskItem from './task-item';
import linkstate from 'linkstate';
import linkref from 'linkref';
import find from 'lodash-es/find';
import cx from 'classnames';
import style from './style';
import AddEditTaskDialog from './add-edit-task-dialog';
import { NEED_STATUS } from '../../constants/tasks';
import { FoldersQuery } from '../../graphql/queries/tasks.graphql';
import { FolderActionMutation } from '../../graphql/queries/folders/folders.graphql';
import { graphql } from 'react-apollo';
import { callWith } from '../../lib/util';
import TaskListContextMenu from './task-list-context-menu';
import { connect } from 'preact-redux';
import { notify } from '../../store/notifications/actions';
import { RenameMessage } from '../notifications/messages';

function NoTasks() {
	return (
		<span class={style.task}>
			<Text id="tasks.NO_TASKS" />
		</span>
	);
}

@withText({
	upcomingLabel: 'tasks.upcoming',
	dueTodayLabel: 'tasks.dueToday',
	pastDueLabel: 'tasks.pastDue',
	urgentLabel: 'tasks.urgent',
	importantLabel: 'tasks.important',
	normalLabel: 'tasks.normal'
})
@connect(
	null,
	{ notify }
)
@withCreateTask()
@graphql(FolderActionMutation, {
	props: ({ ownProps: { notify: displayNotification, title }, mutate }) => ({
		renameTaskList: ({ id, name }) =>
			mutate({
				variables: {
					action: { op: 'rename', id, name }
				},
				optimisticResponse: true,
				update: proxy => {
					//optimistically update the UI with the new folder name before the response comes back
					const data = proxy.readQuery({ query: FoldersQuery });
					data.taskFolders.some(f => f.id === id && (f.name = name));
					proxy.writeQuery({ query: FoldersQuery, data });
				},
				refetchQueries: [
					{
						query: FoldersQuery
					}
				]
			}).then(() => {
				displayNotification({
					message: <RenameMessage prevName={title} name={name} />
				});
			})
	})
})
export default class TaskGroup extends Component {
	state = {
		quickAddTaskName: '',
		isRenaming: false,
		renamingInputValue: '',
		isCollapsed: false
	};

	handleBeginRename = () =>
		this.setState({ isRenaming: true, renamingInputValue: this.props.title });

	handleEndRename = () => this.setState({ isRenaming: false, renamingInputValue: '' });

	handleRenameBlur = () => {
		if (this.props.commitRenameOnBlur) {
			this.handleRenameSubmit();
		} else {
			this.handleEndRename();
		}
	};

	handleRenameSubmit = () => {
		const { renameTaskList, folderId, title } = this.props;
		const name = this.state.renamingInputValue && this.state.renamingInputValue.trim();

		this.handleEndRename();

		// Do not rename for an empty name, or if the name is the same
		if (!name || name === title) {
			return;
		}

		renameTaskList({
			id: folderId,
			name
		}).catch(({ message }) => {
			if (message) {
				this.props.notify({
					message: message.match(/object with that name already exists/) ? (
						<Text id="tasks.duplicateListError" />
					) : (
						message
					),
					failure: true
				});
			}
		});
	};

	// Adding new task using quick add input box
	add = () => {
		const { quickAddTaskName } = this.state;
		const { createTask, folderId, dueDate, priority } = this.props;

		if (quickAddTaskName && quickAddTaskName.trim()) {
			if (createTask) {
				createTask({
					name: quickAddTaskName,
					folderId,
					status: NEED_STATUS,
					percentComplete: '0',
					dueDate,
					priority
				});
			}

			this.setState({ quickAddTaskName: '' });
		}
	};

	handleMouseOver = () => {
		clearTimeout(this.hoverTimer);
		if (!this.state.hovering) {
			this.setState({ hovering: true });
		}
	};

	handleMouseOut = () => {
		clearTimeout(this.hoverTimer);
		this.hoverTimer = setTimeout(() => {
			if (this.state.hovering) {
				this.setState({ hovering: false });
			}
		}, 100);
	};

	toggleCollapsed = () => {
		this.setState({ isCollapsed: !this.state.isCollapsed });
	};

	showAddInput = () => {
		this.setState({ showAddInput: true });
	};

	hideAddInput = () => {
		this.setState({ showAddInput: false });
	};

	handleShowAddEditTaskDialog = editId => {
		this.setState({ showAddEditTaskDialog: true, editId });
	};

	hideAddEditTaskDialog = () => {
		this.setState({ showAddEditTaskDialog: false });
	};

	handleSaveTask = task => {
		this.hideAddEditTaskDialog();
		const saveMethod = task.inviteId ? this.props.onChange : this.props.createTask;
		saveMethod && saveMethod(task);
	};

	handleDeleteList = () => {
		const { onDeleteList, folderId } = this.props;
		onDeleteList(folderId);
	};

	render(
		{
			tasks,
			title,
			titleKey,
			hidePriority,
			hideAdd,
			onChange,
			folders,
			folderId,
			dueDate,
			priority,
			immutable,
			onDelete
		},
		{
			isRenaming,
			renamingInputValue,
			quickAddTaskName,
			isCollapsed,
			showAddInput,
			hovering,
			showAddEditTaskDialog,
			editId
		}
	) {
		let heading = titleKey ? this.props[`${titleKey}Label`] : title;
		if (heading) heading = heading.toUpperCase();
		return (
			<div
				class={cx(
					style.taskList,
					isCollapsed && style.collapsed,
					!isCollapsed && (hovering || showAddInput || quickAddTaskName) && style.isShowingAdd
				)}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
				{heading && (
					<header class={style.listHeader}>
						<ActionButton
							class={style.toggle}
							monotone
							icon="angle-down"
							size="xs"
							onClick={this.toggleCollapsed}
						/>
						{isRenaming ? (
							<FolderInput
								class={style.renameInput}
								value={renamingInputValue}
								onInput={linkstate(this, 'renamingInputValue')}
								onSubmit={this.handleRenameSubmit}
								onBlur={this.handleRenameBlur}
								onClose={this.handleEndRename}
								closeOnBlur={false}
							/>
						) : (
							<TaskListContextMenu
								onDelete={!immutable && this.handleDeleteList}
								onRename={!immutable && this.handleBeginRename}
								onAddTask={this.handleShowAddEditTaskDialog}
							>
								<h5 title={heading} onDblClick={this.handleBeginRename}>
									{heading}
								</h5>
							</TaskListContextMenu>
						)}
						{!hideAdd && !isRenaming && (
							<ActionButton
								class={style.toggleAdd}
								monotone
								icon="plus"
								onClick={callWith(this.handleShowAddEditTaskDialog)}
							/>
						)}
					</header>
				)}

				{showAddEditTaskDialog && (
					<AddEditTaskDialog
						task={find(tasks, task => task.inviteId === editId)}
						folders={folders}
						folderId={folderId}
						dueDate={dueDate}
						priority={priority}
						onSave={this.handleSaveTask}
						onClose={this.hideAddEditTaskDialog}
						onDelete={onDelete}
					/>
				)}

				{!isCollapsed && (
					<ul class={style.list}>
						{tasks.length ? (
							tasks.map(task => (
								<TaskItem
									key={task.id}
									folders={folders}
									task={task}
									hidePriority={hidePriority}
									onChange={onChange}
									onShowEdit={this.handleShowAddEditTaskDialog}
									onDelete={onDelete}
								/>
							))
						) : (
							<NoTasks />
						)}
						{!hideAdd && (
							<div class={cx(style.add, style.task, style.isEditing)}>
								<div class={style.firstLine}>
									<ChoiceInput disabled />
									<form class={style.text} onSubmit={this.add} action="javascript:">
										<Localizer>
											<input
												type="text"
												class={style.editText}
												placeholder={<Text id="tasks.PLACEHOLDER" />}
												autocomplete="off"
												value={quickAddTaskName}
												ref={linkref(this, 'input')}
												onInput={linkstate(this, 'quickAddTaskName')}
												onFocus={this.showAddInput}
												onBlur={this.hideAddInput}
											/>
										</Localizer>
									</form>
								</div>
							</div>
						)}
					</ul>
				)}
			</div>
		);
	}
}
