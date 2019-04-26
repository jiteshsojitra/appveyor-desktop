import get from 'lodash-es/get';
import addDays from 'date-fns/add_days';
import format from 'date-fns/format';
import { COMPLETE_STATUS, NEED_STATUS } from '../constants/tasks';

export function getDueDate(task) {
	return task && get(task, 'instances.0.dueDate');
}

/**
 * Given a task, return true if that task is completed
 */
export function isTaskDone(task) {
	return task && task.status === COMPLETE_STATUS;
}

/**
 * Given a task, return true if that task is overdue.
 */
export function isTaskOverdue(task) {
	const dueDate = getDueDate(task);
	return dueDate && dueDate < Date.now();
}

/**
 * Given a task, return a task that has the opposite completion status
 */
export function toggleTaskDone({ ...task }) {
	[task.status, task.percentComplete] = isTaskDone(task)
		? [NEED_STATUS, '0']
		: [COMPLETE_STATUS, '100'];
	return task;
}

// TODO: Some tasks have dueDate, some have `.instances[0].dueDate`?
/**
 * Given a task, return a new task with a postponed due date
 * @param {Object} task
 * @param {Number|Date} [fromDate]    If fromDate is supplied, postpone begining on that date
 * @param {Number} [days]             The number of days to postpone the task
 */
export function postponeTask(task, fromDate, days = 1) {
	const dueDate = getDueDate(task);

	// If there is no dueDate, return an unmodified task.
	if (!dueDate) {
		return task;
	}

	// TODO: The dueDate shows a day later in the DatePicker than it does here?
	return setDueDate(task, addDays(new Date(fromDate || dueDate), days));
}

// TODO: Some tasks have dueDate, some have `.instances[0].dueDate`?
export function setDueDate(task, dueDate) {
	if (!getDueDate(task)) {
		return task;
	}
	return {
		...task,
		instances: [{ ...task.instances[0], dueDate: dueDate.getTime() }, ...task.instances.slice(1)],
		dueDate: format(dueDate, 'YYYY-MM-DD')
	};
}

export function sortByDueDate(taskA, taskB) {
	const aDue = getDueDate(taskA) || Number.POSITIVE_INFINITY;
	const bDue = getDueDate(taskB) || Number.POSITIVE_INFINITY;
	return aDue < bDue ? -1 : aDue > bDue ? 1 : 0;
}
