import find from 'lodash/find';

export function newAlarm(
	{ action = 'DISPLAY', interval = { minutes: 5 }, attendees = null } = {
		action: 'DISPLAY',
		interval: { minutes: 5 },
		attendees: null
	}
) {
	const alarm = {
		action,
		trigger: {
			relative: {
				...interval,
				relatedTo: 'START',
				negative: true
			}
		}
	};

	if (attendees) {
		alarm.attendees = attendees;
	}

	return alarm;
}

export function cloneAlarm(alarm, { action }) {
	return {
		...alarm,
		action
	};
}

export function hasEmailAlarm(alarms) {
	return !!find(alarms, a => a.action === 'EMAIL');
}

export function hasDisplayAlarm(alarms) {
	return !!find(alarms, a => a.action === 'DISPLAY');
}

export function deletePermissionCheck(permissions, eventClass) {
	const deletePermission = permissions.includes('d');
	return (
		(eventClass === 'PRI' && permissions.includes('p') && deletePermission) ||
		(eventClass === 'PUB' && deletePermission)
	);
}
