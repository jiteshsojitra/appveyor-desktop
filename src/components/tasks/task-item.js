import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import linkState from 'linkstate';
import linkref from 'linkref';
import moment from 'moment';
import isSameYear from 'date-fns/is_same_year';
import TaskItemContextMenu from './task-item-context-menu';
import { URGENT_PRIORITY, IMPORTANT_PRIORITY } from '../../constants/tasks';
import { isTaskDone, toggleTaskDone, getDueDate } from '../../utils/tasks';
import { KeyCodes, ChoiceInput } from '@zimbra/blocks';
import TaskPopover from './task-popover';
import { connect } from 'preact-redux';
import { notify as notifyActionCreator } from '../../store/notifications/actions';
import cx from 'classnames';
import style from './style';

@connect(
	null,
	{ notify: notifyActionCreator }
)
@withText({
	formatWeekDayShortDate: 'timeFormats.dateFormats.formatWeekDayShortDate',
	formatWeekDayLongDate: 'timeFormats.dateFormats.formatWeekDayLongDate'
})
export default class TaskItem extends Component {
	state = {
		edit: false,
		name: '',
		isDone: isTaskDone(this.props.task)
	};

	toggleEdit = () => {
		const edit = !this.state.edit;
		clearTimeout(this.cancelEditTimer);
		this.setState({ edit });
		if (edit) this.setState({ name: this.props.task.name });
	};

	cancelEdit = () => {
		clearTimeout(this.cancelEditTimer);
		this.cancelEditTimer = setTimeout(() => {
			if (this.state.edit) {
				this.setState({ edit: false });
			}
		});
	};

	saveEdit = e => {
		let { task, onChange } = this.props;
		const { name } = this.state;
		clearTimeout(this.cancelEditTimer);
		this.setState({ edit: false, name: null });
		task = { ...task, name };
		if (onChange) onChange(task);
		if (e) e.preventDefault();
	};

	handleCheckboxClick = e => {
		this.toggleDone();

		if (e) {
			e.stopPropagation();
			e.preventDefault();
		}
	};
	toggleDone = (task = this.props.task) => {
		const { onChange } = this.props;
		const updatedTask = toggleTaskDone(task);

		if (isTaskDone(updatedTask)) {
			this.setState({ isDone: true });
			this.onChangeTimer = setTimeout(() => onChange(updatedTask), 1000);

			// Notify optimistically
			this.props.notify({ message: <Text id="tasks.notifications.completed" /> });
		} else {
			delete this.onChangeTimer;
			this.setState({ isDone: false });
			onChange && onChange(updatedTask);
		}
	};

	handleKeyDown = e => {
		if (e.keyCode === KeyCodes.ESCAPE) {
			this.cancelEdit();
		}
	};

	componentWillReceiveProps(nextProps) {
		if (nextProps.task.status !== this.props.task.status) {
			this.setState({ isDone: isTaskDone(nextProps.task) });
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.edit && !prevState.edit) {
			this.refs.input.focus();
		}
	}

	render(
		{
			task,
			folders,
			hidePriority,
			onShowEdit,
			onDelete,
			onChange,
			formatWeekDayLongDate,
			formatWeekDayShortDate
		},
		{ name, edit, isDone }
	) {
		let dueDate = getDueDate(task);
		if (dueDate)
			dueDate = isSameYear(dueDate, new Date())
				? moment(dueDate).format(formatWeekDayShortDate)
				: moment(dueDate).format(formatWeekDayLongDate);

		return (
			<div class={style.task}>
				<TaskItemContextMenu
					onEdit={onShowEdit}
					onToggleDone={this.toggleDone}
					onChange={onChange}
					onDelete={onDelete}
					task={task}
				>
					<TaskPopover task={task} folders={folders} onDelete={onDelete} onEdit={onShowEdit}>
						<div>
							<div class={cx(style.firstLine, edit && style.isEditing)}>
								<ChoiceInput checked={isDone} onClick={this.handleCheckboxClick} />
								{edit && (
									<form class={style.text} onSubmit={this.saveEdit}>
										<input
											ref={linkref(this, 'input')}
											class={style.editText}
											value={name}
											onKeyDown={this.handleKeyDown}
											onInput={linkState(this, 'name')}
											onBlur={this.cancelEdit}
										/>
									</form>
								)}
								{!edit && (
									<span
										class={cx(style.text, isDone && style.isDone)}
										onDblClick={this.toggleEdit}
										title={task.name}
									>
										{task.name}
									</span>
								)}
								{!edit && !hidePriority && task.priority === URGENT_PRIORITY
									? '!!'
									: task.priority === IMPORTANT_PRIORITY
									? '!'
									: ''}
							</div>
							<div class={style.dueDate}>{dueDate}</div>
						</div>
					</TaskPopover>
				</TaskItemContextMenu>
			</div>
		);
	}
}
