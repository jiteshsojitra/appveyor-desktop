import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { Button } from '@zimbra/blocks';
import { TaskQuery } from '../../graphql/queries/tasks.graphql';
import { graphql } from 'react-apollo';
import get from 'lodash-es/get';
import linkState from 'linkstate';
import ModalDialog from '../modal-dialog';
import style from './style';
import AlignedForm from '../aligned-form';
import AlignedLabel from '../aligned-form/label';
import FormGroup from '../form-group';
import TextInput from '../text-input';
import DateInput from '../date-input';
import Select from '../select';
import Textarea from '../textarea';
import {
	URGENT_PRIORITY,
	IMPORTANT_PRIORITY,
	NORMAL_PRIORITY,
	NEED_STATUS
} from '../../constants/tasks';
import { withProps } from 'recompose';
import { getDueDate } from '../../utils/tasks';

@withProps(({ folderId, folders }) => ({
	folderId: folderId || folders[0].id
}))
// Get the task info and flatten it
@graphql(TaskQuery, {
	skip: ({ task }) => !task || !task.inviteId,
	options: ({ task }) => ({
		variables: {
			id: task.inviteId
		}
	}),
	props: ({ data: { loading, task } }) =>
		loading
			? { loading }
			: {
					notes: get(task, 'invitations.0.components.0.description.0._content')
			  }
})
export default class AddEditTaskDialog extends Component {
	calcState = ({
		folders,
		folderId,
		task: { name, priority, status, inviteId, ...task },
		notes,
		invalidDate = false
	}) => ({
		dueDate: getDueDate(task),
		folderId: folderId || folders[0].id,
		name,
		priority: priority || NORMAL_PRIORITY,
		status: status || NEED_STATUS,
		inviteId: inviteId || '',
		notes,
		invalidDate
	});

	state = this.calcState(this.props);

	confirm = () => {
		const {
			onSave,
			task: { inviteId }
		} = this.props;
		const { invalidDate } = this.state;
		onSave &&
			onSave({
				inviteId,
				...this.state,
				...(invalidDate && {
					dueDate: null
				})
			});
	};

	handleDueDateChange = dueDate => {
		this.setState({ dueDate });
	};

	handleClickDelete = () => {
		const { onClose, onDelete, task } = this.props;

		onDelete(task);
		onClose();
	};

	handleInvalidDate = isDateInvalid => {
		this.setState({
			invalidDate: isDateInvalid
		});
	};

	static defaultProps = {
		task: {}
	};

	componentWillReceiveProps(nextProps) {
		if (this.props.task.inviteId !== nextProps.task.inviteId) {
			this.setState(this.calcState(nextProps));
		}
		if (nextProps.notes !== this.props.notes) {
			this.setState({ notes: nextProps.notes });
		}
	}

	renderButtons = () => {
		const { task } = this.props;
		const { name, invalidDate } = this.state;

		return [
			<Button
				styleType="primary"
				brand="primary"
				onClick={this.confirm}
				disabled={!(name && name.trim()) || invalidDate}
			>
				<Text id="buttons.save" />
			</Button>,
			task.inviteId && (
				<Button onClick={this.handleClickDelete}>
					<Text id="buttons.delete" />
				</Button>
			)
		].filter(Boolean);
	};

	render(
		{ folders, task, loading, onClose },
		{ dueDate, folderId, name, notes, priority, invalidDate }
	) {
		const { inviteId } = task;
		return (
			<ModalDialog
				class={style.addEditTaskDialog}
				title={inviteId ? 'tasks.addTask.editTitle' : 'tasks.addTask.placeholder'}
				buttons={this.renderButtons()}
				cancelLabel="buttons.cancel"
				onClose={onClose}
				disableOutsideClick
			>
				{invalidDate && (
					<p class={style.dateErrorText}>
						<Text id="tasks.addTask.error.invalidDate" />
					</p>
				)}
				<AlignedForm>
					<FormGroup>
						<TextInput
							placeholderId="tasks.addTask.placeholder"
							value={name}
							onInput={linkState(this, 'name')}
							wide
							autofocus
						/>
					</FormGroup>
					<FormGroup>
						<AlignedLabel>
							<Text id="tasks.addTask.dueDate" />
						</AlignedLabel>
						<DateInput
							dateValue={dueDate}
							invalid={invalidDate}
							onDateChange={this.handleDueDateChange}
							handleInvalidDate={this.handleInvalidDate}
						/>
					</FormGroup>
					<FormGroup>
						<AlignedLabel>
							<Text id="tasks.addTask.priority.label" />
						</AlignedLabel>
						{
							<Select
								value={priority}
								onChange={linkState(this, 'priority')}
								cls={style.addEditTaskDialog}
							>
								<option value={NORMAL_PRIORITY} key={`priority-normal`}>
									<Text id="tasks.normal" />
								</option>
								<option value={IMPORTANT_PRIORITY} key={`priority-important`}>
									<Text id="tasks.important" />
								</option>
								<option value={URGENT_PRIORITY} key={`priority-urgent`}>
									<Text id="tasks.urgent" />
								</option>
							</Select>
						}
					</FormGroup>
					<FormGroup>
						<AlignedLabel>
							<Text id="tasks.addTask.lists.label" />
						</AlignedLabel>
						<Select value={folderId} onChange={linkState(this, 'folderId')}>
							{folders.map(({ name: fname, id }) => (
								<option value={id} key={`task-list-${id}`}>
									{fname}
								</option>
							))}
						</Select>
					</FormGroup>
					<FormGroup>
						<AlignedLabel>
							<Text id="tasks.addTask.notes" />
						</AlignedLabel>
						<Textarea
							disabled={loading}
							rows="1"
							wide
							value={loading ? 'Loading...' : notes}
							onInput={linkState(this, 'notes')}
						/>
					</FormGroup>
				</AlignedForm>
			</ModalDialog>
		);
	}
}
