import { h, Component } from 'preact';
import { Spinner } from '@zimbra/blocks';
import { Text, withText } from 'preact-i18n';
import CreateListDialog from './create-list-dialog';
import { getPrimaryAccountName, getPrimaryAccountAddress } from '../../utils/account';
import { sortByDueDate } from '../../utils/tasks';
import { graphql } from 'react-apollo';
import {
	TaskQuery,
	FoldersQuery,
	TaskCancelMutation,
	TaskMoveMutation,
	TaskHardDeleteMutation
} from '../../graphql/queries/tasks.graphql';
import { FolderCreateMutation } from '../../graphql/queries/folders/folders.graphql';
import withCreateTask from '../../graphql-decorators/tasks/create-task';
import withModifyTask from '../../graphql-decorators/tasks/modify-task';
import { TASK_VIEW } from '../../constants/views';
import TaskGroup from './task-group';
import SettingsMenu from './settings-menu';
import get from 'lodash-es/get';
import isSameDay from 'date-fns/is_same_day';
import startOfDay from 'date-fns/start_of_day';
import cx from 'classnames';
import style from './style';
import {
	URGENT_PRIORITY,
	IMPORTANT_PRIORITY,
	NORMAL_PRIORITY,
	COMPLETE_STATUS,
	PRIORITY_VIEW,
	LIST_VIEW,
	DUE_DATE_VIEW,
	DONE_VIEW
} from '../../constants/tasks';
import { DEFAULT_NOTIFICATION_DURATION } from '../../constants/notifications';
import AddEditTaskDialog from './add-edit-task-dialog';
import { connect } from 'preact-redux';
import { notify as notifyActionCreator } from '../../store/notifications/actions';
import { USER_FOLDER_IDS } from '../../constants';
import { withProps } from 'recompose';
import { optimisticTaskMove } from '../../graphql-decorators/tasks/util';

@withText({
	undoLabel: 'buttons.undo'
})
@connect(
	null,
	{ notify: notifyActionCreator }
)
@withProps(accountInfoData => {
	const accountInfo = get(accountInfoData, 'accountInfo');

	return (
		accountInfo && {
			userDisplayName: getPrimaryAccountName(accountInfo),
			primaryAddress: getPrimaryAccountAddress(accountInfo)
		}
	);
})
@graphql(FoldersQuery, {
	props: ({ data: { taskFolders } }) => ({
		folders: taskFolders
	})
})
@graphql(FolderCreateMutation, {
	props: ({ mutate, ownProps: { notify } }) => ({
		createTaskList: name =>
			mutate({
				variables: {
					name,
					view: TASK_VIEW
				},
				refetchQueries: [
					{
						query: FoldersQuery
					}
				]
			}).then(data => {
				notify({
					message: <Text id="tasks.notifications.createList" />
				});
				return data;
			})
	})
})
@withCreateTask()
// Folder Action Mutations!
@withModifyTask()
@graphql(TaskMoveMutation, {
	props: ({ mutate }) => ({
		moveTask: ({ inviteId, destFolderId }) =>
			mutate({
				variables: {
					id: inviteId,
					folderId: destFolderId
				},
				// Optimistically update data on UI
				optimisticResponse: {
					itemAction: {}
				},
				update: proxy => {
					const data = proxy.readQuery({ query: FoldersQuery });

					optimisticTaskMove(data, inviteId, destFolderId);

					proxy.writeQuery({ query: FoldersQuery, data });
				},
				refetchQueries: [
					{
						query: FoldersQuery
					},
					{
						query: TaskQuery,
						variables: { id: inviteId }
					}
				]
			})
	})
})
@graphql(TaskHardDeleteMutation, {
	props: ({ mutate }) => ({
		hardDeleteTask: ({ inviteId }) =>
			mutate({
				variables: {
					id: inviteId
				},
				refetchQueries: [
					{
						query: FoldersQuery
					}
				]
			})
	})
})
@graphql(TaskCancelMutation, {
	props: ({ ownProps: { notify, moveTask, hardDeleteTask, undoLabel }, mutate }) => ({
		deleteTask: ({ inviteId, folderId }) =>
			mutate({
				variables: {
					inviteId
				},
				// Optimistically update data on UI
				optimisticResponse: {
					cancelTask: {}
				},
				update: proxy => {
					const data = proxy.readQuery({ query: FoldersQuery });

					optimisticTaskMove(data, inviteId, USER_FOLDER_IDS.TRASH);

					proxy.writeQuery({ query: FoldersQuery, data });
				},
				refetchQueries: [
					{
						query: FoldersQuery
					},
					{
						query: TaskQuery,
						variables: { id: inviteId }
					}
				]
			}).then(() => {
				// Delete task permanently once user loses ability to undo operation
				const timer = setTimeout(() => {
					hardDeleteTask({ inviteId });
				}, DEFAULT_NOTIFICATION_DURATION * 1000);

				notify({
					message: <Text id="tasks.notifications.delete" />,
					action: {
						label: undoLabel,
						fn: () => {
							// Cancel timer
							clearTimeout(timer);
							notify({
								message: <Text id="tasks.notifications.deleteUndone" />
							});

							// Move task item back to it's original parent folder
							moveTask({ inviteId, destFolderId: folderId });
						}
					}
				});
			})
	})
})
export default class Tasks extends Component {
	state = {
		view: LIST_VIEW
	};

	setViewMode = view => {
		this.setState({ view });
	};

	showShare = () => {
		// @TODO not implemented.
	};

	showCreateList = () => {
		this.setState({ showCreateList: true });
	};

	hideCreateList = () => {
		this.setState({ createListError: null, showCreateList: false });
	};

	createList = name => {
		if (!name) return;

		return this.props
			.createTaskList(name)
			.then(this.hideCreateList)
			.catch(({ message }) => {
				const createListError = message.match(/object with that name already exists/) ? (
					<Text id="tasks.duplicateListError" />
				) : (
					message
				);
				this.setState({ createListError });
			});
	};

	/**
	 * Remove the Trash folder.  Sort putting the "Tasks" folder first and order by name after that
	 * and replace the name of "Tasks" with the userDisplayName
	 */
	sortAndFilterFolders = (folders = [], userDisplayName = 'Tasks') =>
		folders
			.filter(f => f.name !== 'Trash')
			.sort(({ name: nameA }, { name: nameB }) =>
				nameA === 'Tasks' ? -1 : nameB === 'Tasks' ? 1 : nameA > nameB ? 1 : nameB > nameA ? -1 : 0
			)
			.map(f => ({
				...f,
				name: f.name === 'Tasks' ? userDisplayName : f.name
			}));

	getListGroups = folders =>
		folders.map(({ name: title, id, tasks }, index) => ({
			title,
			folderId: id,
			tasks: tasks.tasks.filter(t => t.status !== COMPLETE_STATUS),
			immutable: index === 0 // Allow rename of all lists except for the first
		}));

	getPriorityGroups = folders => {
		const groups = [
			{
				titleKey: 'urgent',
				tasks: [],
				folderId: folders[0].id,
				priority: URGENT_PRIORITY
			},
			{
				titleKey: 'important',
				tasks: [],
				folderId: folders[0].id,
				priority: IMPORTANT_PRIORITY
			},
			{
				titleKey: 'normal',
				tasks: [],
				folderId: folders[0].id,
				priority: NORMAL_PRIORITY
			}
		];
		folders.forEach(({ tasks }) =>
			tasks.tasks.forEach(
				t =>
					t.status !== COMPLETE_STATUS &&
					groups[
						t.priority === URGENT_PRIORITY ? 0 : t.priority === IMPORTANT_PRIORITY ? 1 : 2
					].tasks.push(t)
			)
		);
		return groups;
	};

	getDueDateGroups = folders => {
		const groups = [
			{
				titleKey: 'pastDue',
				tasks: [],
				folderId: folders[0].id,
				hideAdd: true
			},
			{
				titleKey: 'dueToday',
				tasks: [],
				folderId: folders[0].id,
				dueDate: startOfDay(Date.now())
			},
			{
				titleKey: 'upcoming',
				tasks: [],
				folderId: folders[0].id
			}
		];
		const today = startOfDay(Date.now());
		folders.forEach(({ tasks }) =>
			tasks.tasks.forEach(t => {
				const dueDate = get(t, 'instances.[0].dueDate');
				t.status !== COMPLETE_STATUS &&
					groups[dueDate && dueDate < today ? 0 : isSameDay(dueDate, today) ? 1 : 2].tasks.push(t);
			})
		);

		//sort the upcoming tasks by due date
		groups.forEach(({ tasks }) => tasks.sort(sortByDueDate));

		return groups;
	};

	getDoneGroups = folders => {
		const groups = [
			{
				tasks: [],
				folderId: folders[0].id,
				hideAdd: true
			}
		];
		folders.forEach(({ tasks }) =>
			tasks.tasks.forEach(t => t.status === COMPLETE_STATUS && groups[0].tasks.push(t))
		);

		return groups;
	};

	getGroupsCallback(view) {
		switch (view) {
			case PRIORITY_VIEW:
				return this.getPriorityGroups;
			case DUE_DATE_VIEW:
				return this.getDueDateGroups;
			case DONE_VIEW:
				return this.getDoneGroups;
			default:
				return this.getListGroups;
		}
	}

	handleSaveTask = task => {
		this.props.createTask && this.props.createTask(task);
		this.hideAddEditTask();
	};

	showAddEditTask = () => this.setState({ showAddEditTask: true });

	hideAddEditTask = () => this.setState({ showAddEditTask: false });

	render(
		{ folders, userDisplayName, modifyTask, createTask, deleteTask, trashFolder, ...props },
		{ view, showCreateList, createListError, showAddEditTask }
	) {
		let groups = [];

		if (!folders) {
			return (
				<div class={style.loading}>
					<Spinner class={style.spinner} />
					<div>
						<Text id={'tasks.loading'} />
					</div>
				</div>
			);
		}

		folders = this.sortAndFilterFolders(folders, userDisplayName);

		groups = this.getGroupsCallback(view)(folders);

		return (
			<div class={cx(style.tasks, props.class)}>
				<header class={style.header}>
					<SettingsMenu
						activeView={view}
						setViewMode={this.setViewMode}
						openAddTask={this.showAddEditTask}
						createList={this.showCreateList}
						share={this.showShare}
					/>
					<h4>
						<Text id={`tasks.TITLE_${view}`} />
					</h4>
				</header>

				{groups.map(groupProps => (
					<TaskGroup
						{...groupProps}
						folders={folders}
						hidePriority={view === PRIORITY_VIEW}
						onChange={modifyTask}
						onAdd={createTask}
						onDeleteList={trashFolder}
						onDelete={deleteTask}
					/>
				))}

				{showCreateList && (
					<CreateListDialog
						error={createListError}
						onCreate={this.createList}
						onClose={this.hideCreateList}
					/>
				)}

				{showAddEditTask && (
					<AddEditTaskDialog
						folders={folders}
						folderId={folders[0].id}
						onSave={this.handleSaveTask}
						onClose={this.hideAddEditTask}
					/>
				)}
			</div>
		);
	}
}
