import { h, Component } from 'preact';
import moment from 'moment';
import { Button, Popover, Spinner } from '@zimbra/blocks';
import { Text, withText } from 'preact-i18n';
import get from 'lodash-es/get';
import style from './style';
import { graphql } from 'react-apollo';
import { TaskQuery } from '../../graphql/queries/tasks.graphql';
import { URGENT_PRIORITY, IMPORTANT_PRIORITY } from '../../constants/tasks';

export default class TaskPopover extends Component {
	closePopover = () => {
		this.setState({ active: false });
	};

	onPopoverToggle = active => {
		this.setState({ active });
	};

	render(
		{
			folders,
			children,
			onEdit,
			onDelete,
			task: { name, folderId, instances, inviteId, priority, excerpt }
		},
		{ active }
	) {
		//This is a bit hack-ey, but seems necessary unless we can get popper.js to overflow an x-access
		//while the y-axis is scrollable
		if (!this.boundary)
			this.boundary = document.getElementsByClassName('zimbra-client_app_main')[0];

		return (
			<Popover
				placement="left"
				active={active}
				anchor="center"
				arrow
				boundariesElement={this.boundary}
				target={children[0]}
				onToggle={this.onPopoverToggle}
			>
				<TaskPopoverData
					folders={folders}
					closePopover={this.closePopover}
					onEdit={onEdit}
					onDelete={onDelete}
					inviteId={inviteId}
					name={name}
					folderId={folderId}
					dueDate={get(instances, '0.dueDate')}
					priority={priority}
					excerpt={excerpt}
				/>
			</Popover>
		);
	}
}

// Get the task info and flatten it
@graphql(TaskQuery, {
	// Assume task item doesn't have notes when excerpt field is empty
	skip: props => !props.excerpt,
	options: props => ({
		variables: {
			id: props.inviteId
		}
	}),
	props: ({ data: { loading, task } }) => ({
		loading,
		notes: task && get(task, 'invitations.0.components.0.description.0._content')
	})
})
@withText({
	customformatDateYearLong: 'timeFormats.dateFormats.customformatDateYearLong'
})
class TaskPopoverData extends Component {
	handleDelete = () => {
		const { onDelete, closePopover, inviteId, folderId } = this.props;

		onDelete({ inviteId, folderId });
		closePopover();
	};

	handleEdit = () => {
		const { onEdit, closePopover, inviteId } = this.props;

		onEdit(inviteId);
		closePopover();
	};

	render({
		folders,
		folderId,
		name,
		dueDate,
		priority,
		loading,
		excerpt,
		notes,
		customformatDateYearLong
	}) {
		const listName = folders.find(f => f.id === folderId).name;
		const noteDisplay = notes || excerpt;
		return (
			<div class={style.popover}>
				<div class={style.name}>
					{name} {priority === URGENT_PRIORITY ? '!!' : priority === IMPORTANT_PRIORITY ? '!' : ''}
				</div>
				{dueDate && (
					<div class={style.date}>{moment(dueDate).format(customformatDateYearLong)}</div>
				)}
				<div class={style.listName}>{listName}</div>
				{noteDisplay && (
					<div>
						<hr />
						<div class={style.notes}>
							{noteDisplay}
							{loading && (
								<div class={style.popover_loading}>
									<Spinner class={style.spinner} />
								</div>
							)}
						</div>
					</div>
				)}
				<div class={style.buttonGroup}>
					<Button type="button" class={style.button} onClick={this.handleEdit}>
						<Text id="buttons.edit" />
					</Button>
					<Button type="button" class={style.button} onClick={this.handleDelete}>
						<Text id="buttons.delete" />
					</Button>
				</div>
			</div>
		);
	}
}
