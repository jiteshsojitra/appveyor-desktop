import { h, Component } from 'preact';
import style from './style';
import { Button, ModalDialog } from '@zimbra/blocks';
import { callWith } from '@zimbra/util/src/call-with';
import cx from 'classnames';
import { distanceInWords } from 'date-fns';
import moment from 'moment';
import { Text, withText } from 'preact-i18n';

async function getEvents(client) {
	let output;

	const startRange = new Date();
	const endRange = new Date();
	endRange.setDate(endRange.getDate() + 14);

	await client
		.jsonRequest({
			name: 'Search',
			body: {
				calExpandInstStart: startRange.getTime(),
				calExpandInstEnd: endRange.getTime(),
				limit: 1000,
				offset: 0,
				types: 'appointment',
				query: 'inid:"10"'
			}
		})
		.then(response => response.appt || [])
		.then(response => response.filter(appt => appt.alarm && appt.alarmData))
		.then(response => response.filter(appt => new Date(appt.alarmData[0].nextAlarm) <= Date.now()))
		.then(response => (output = response));
	return output;
}

async function snoozeCalendarAlarm(client, { appt = [], task = [] }) {
	let output;
	// Set the snooze time 5 minutes into the future
	const until = new Date();
	until.setMinutes(until.getMinutes() + 5);

	// Setup Requests to the API
	const requestData = {
		name: 'SnoozeCalendarItemAlarm',
		body: {}
	};

	if (Array.isArray(appt) && appt.length > 0) {
		requestData.body.appt = appt.map(individualAppointment => ({
			id: individualAppointment,
			until: until.getTime()
		}));
	}
	if (Array.isArray(task) && task.length > 0) {
		requestData.body.task = task.map(individualTask => ({
			id: individualTask,
			until: until.getTime()
		}));
	}

	await client.jsonRequest(requestData).then(response => (output = response));

	return output;
}

async function dismissCalendarAlarm(client, { appt = [], task = [] }) {
	let output;
	const dismissedAt = Date.now();
	const requestData = {
		name: 'DismissCalendarItemAlarm',
		body: {}
	};

	if (Array.isArray(appt) && appt.length > 0) {
		requestData.body.appt = appt.map(id => ({
			id,
			dismissedAt
		}));
	}
	if (Array.isArray(task) && task.length > 0) {
		requestData.body.task = task.map(id => ({
			id,
			dismissedAt
		}));
	}

	await client.jsonRequest(requestData).then(response => (output = response));

	return output;
}

@withText({
	nowText: 'notifications.dates.now',
	inText: 'notifications.dates.in',
	overdueText: 'notifications.dates.overdue',
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatLT: `${timeFormats}.longDateFormat.LT`,
		formatDateTimeMedium: `${timeFormats}.formatDateTimeMedium`
	};
})
export default class Reminders extends Component {
	state = {
		appointments: [],
		loading: false,
		dismissed: false
	};

	pollReminders = async () => {
		const oldAppointments = this.state.appointments;
		this.setState({ loading: true });
		const results = await getEvents(this.context.zimbraBatchClient);
		this.setState(
			{
				loading: false,
				appointments: [
					...results.map(appt => ({
						name: appt.name,
						start: new Date(appt.inst[0].s),
						end: new Date(appt.inst[0].s + appt.dur),
						alarm: new Date(appt.alarmData[0].nextAlarm),
						id: appt.id
					}))
				]
			},
			() => {
				const { appointments } = this.state;
				const newAppointments = appointments.filter(
					appt => oldAppointments.filter(oldAppt => oldAppt.id === appt.id).length === 0
				);
				newAppointments.forEach(appt => this.generateNotification(appt));
			}
		);
	};

	generateNotification = appt => {
		// Supports Notification API
		if (Notification && Notification.permission === 'granted') {
			const timer = this.readableCountdown(appt.start);
			const options = {
				body: timer,
				requireInteraction: true
			};
			const notice = new Notification(appt.name, options);

			notice.addEventListener('click', () => {
				window.focus();
				notice.close();
			});
		}
	};

	readableTimeslot(start, end) {
		const sameDay = start.getDate() === end.getDate();
		const { formatDateTimeMedium, formatLT } = this.props;
		return sameDay
			? `${moment(start).format(formatDateTimeMedium)} - ${moment(end).format(formatLT)}`
			: `${moment(start).format(formatDateTimeMedium)} - ${moment(end).format(
					formatDateTimeMedium
			  )}`;
	}

	readableCountdown(start) {
		let timeDifference = start - Date.now();
		const { inText, nowText, overdueText } = this.props;

		if (timeDifference < 0) {
			timeDifference = Math.abs(timeDifference);
			if (Math.floor(timeDifference / 1000 / 60) > 5) {
				return `${overdueText} ${distanceInWords(Date.now(), start)}`;
			}
			return nowText;
		}
		return `${inText} ${distanceInWords(Date.now(), start)}`;
	}

	dismissEvent = async id => {
		this.setState({ loading: true });
		await dismissCalendarAlarm(this.context.zimbraBatchClient, { appt: [id] });
		this.setState({
			loading: false,
			dismissed: this.state.appointments.length === 1,
			appointments: this.state.appointments.filter(item => item.id !== id)
		});
	};

	snoozeEvent = async id => {
		this.setState({ loading: true });
		await snoozeCalendarAlarm(this.context.zimbraBatchClient, { appt: [id] });
		this.setState({
			loading: false,
			dismissed: this.state.appointments.length === 1,
			appointments: this.state.appointments.filter(item => item.id !== id)
		});
	};

	dismissAll = () => {
		const { appointments } = this.state;
		appointments.forEach(appointment => {
			this.dismissEvent(appointment.id);
		});
	};

	snoozeAll = () => {
		const { appointments } = this.state;
		appointments.forEach(appointment => {
			this.snoozeEvent(appointment.id);
		});
	};

	componentDidMount() {
		this.pollReminders();
		// Poll every minute
		this.pollInterval = setInterval(this.pollReminders, 60000);
		// Browser supports notifications and the user hasn't yet given us permission
		if (Notification && Notification.permission === 'default') {
			Notification.requestPermission();
		}
	}

	componentWillUnmount() {
		// Remove our periodic event listeners
		clearInterval(this.pollInterval);
	}

	render(_, { appointments, dismissed }) {
		const hasAppts = appointments.length > 0;
		const multipleAppts = appointments.length > 1;

		return (
			hasAppts &&
			!dismissed && (
				<ModalDialog onClickOutside={!dismissed && this.dismissAll} class={style.modalDialog}>
					<div className={style.apptWindow}>
						<div className={style.apptHeading}>
							<h5>
								<Text id="calendar.notifications.appointmentReminder" />
							</h5>
						</div>
						<ul className={cx(style.apptContainer, { [style.multi]: multipleAppts })}>
							{appointments.map(appointment => (
								<li key={appointment.id} className={style.appt}>
									<h4 className={style.apptName}>{appointment.name}</h4>
									<div className={style.apptMetaActionsContainer}>
										<div className={style.apptMeta}>
											<i>{this.readableTimeslot(appointment.start, appointment.end)}</i>
											<b>{this.readableCountdown(appointment.start)}</b>
										</div>
										<div className={style.apptActions}>
											<Button
												styleType="primary"
												brand="primary"
												class={style.actionBtn}
												onClick={callWith(this.snoozeEvent, appointment.id)}
											>
												<Text id="buttons.snooze" />
											</Button>
											<Button
												class={style.actionBtn}
												onClick={callWith(this.dismissEvent, appointment.id)}
											>
												<Text id="buttons.dismiss" />
											</Button>
										</div>
									</div>
								</li>
							))}
						</ul>
						{multipleAppts && (
							<div className={style.allActions}>
								<Button
									styleType="primary"
									brand="primary"
									class={style.actionBtn}
									onClick={this.snoozeAll}
								>
									<Text id="buttons.snoozeAll" />
								</Button>
								<Button class={style.actionBtn} onClick={this.dismissAll}>
									<Text id="buttons.dismissAll" />
								</Button>
							</div>
						)}
					</div>
				</ModalDialog>
			)
		);
	}
}
