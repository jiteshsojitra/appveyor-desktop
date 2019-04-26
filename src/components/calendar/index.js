import { h, Component } from 'preact';
import cx from 'classnames';
import { branch, renderComponent, withProps } from 'recompose';
import moment from 'moment';
import BigCalendar from 'react-big-calendar';
import 'react-big-calendar/lib/less/styles.less';
import { Text, withText } from 'preact-i18n';
import { route } from 'preact-router';

import startOfDay from 'date-fns/start_of_day';
import startOfWeek from 'date-fns/start_of_week';
import startOfMonth from 'date-fns/start_of_month';
import endOfMonth from 'date-fns/end_of_month';
import isSameDay from 'date-fns/is_same_day';
import addMilliseconds from 'date-fns/add_milliseconds';
import { connect } from 'preact-redux';
import * as calendarActionCreators from '../../store/calendar/actions';
import { graphql } from 'react-apollo';
import get from 'lodash/get';
import omit from 'lodash/omit';
import flatMap from 'lodash/flatMap';
import invert from 'lodash/invert';
import find from 'lodash/find';
import cloneDeep from 'lodash/cloneDeep';
import some from 'lodash/some';
import flow from 'lodash/flow';
import isString from 'lodash-es/isString';
import {
	VIEW_AGENDA,
	VIEW_DAY,
	VIEW_WEEK,
	VIEW_MONTH,
	VIEW_YEAR,
	MODAL_ACTIONS,
	ROUTE_EVENT,
	ROUTE_ALL,
	ROUTE_SINGLE,
	ROUTE_NEW,
	ROUTE_EDIT
} from './constants';
import CalendarToolbar from './toolbar';
import CalendarSectionToolbar from './section-toolbar';
import CalendarSidebar from './sidebar';
import CalendarRightbar from './rightbar';
import CalendarDateHeader from './date-header';
import CreateCalendarModal from './create-calendar-modal';
import CreateSharedCalendarModal from './create-shared-calendar-modal';
import { CalendarEventDetailsModal } from './event-details';
import ImportCalendarModal from './import-calendar-modal';
import ExportCalendarModal from './export-calendar-modal';
import { CalendarEvent, CalendarEventWrapper, getEventProps } from './event';
import YearView from './year-view';
import QuickAddEventPopover from './quick-add-event-popover';
import AppointmentEditEvent from './appointment-edit';
import RecurrenceEditModal from './appointment-edit/recurrence-edit-modal';
import RecurrenceDeleteModal from './appointment-delete/recurrence-delete-modal';
import InformOrganizer from './appointment-delete/inform-organizer-modal';
import ConfirmDelete from './appointment-delete/confirm-delete-modal';
import SkeletonWithSidebar from '../skeletons/with-sidebar';
import CalendarsQuery from '../../graphql/queries/calendar/calendars.graphql';
import CalendarsAndAppointmentsQuery from '../../graphql/queries/calendar/calendars-and-appointments.graphql';
import { withModifyPrefs } from '../../graphql-decorators/preferences';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';
import CalendarChangeColorMutation from '../../graphql/queries/calendar/calendar-change-color.graphql';
import { FolderActionMutation } from '../../graphql/queries/folders/folders.graphql';
import {
	withCreateAppointment,
	withModifyAppointment,
	withDeleteAppointment,
	withMoveAppointment,
	withCreateAppointmentException
} from '../../graphql-decorators/calendar';
import SendInviteReply from '../../graphql/queries/send-invite-reply.graphql';
import { hasFlag } from '../../utils/folders';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { notify as notifyActionCreator } from '../../store/notifications/actions';
import { showNotificationModal as openNotificationModal } from '../../store/notification-modal/actions';
import style from './style';
import { switchTimeFormat } from '../../lib/util';
import { shallowEqual } from '../../lib/pure-component';
import PrintCalendarModal from './print-calendar-modal';
import {
	colorForCalendar,
	filterNonEditableCalendars,
	isParticipatingInEvent,
	getView,
	getWorkingHours,
	getDOW
} from '../../utils/calendar';
import { newAlarm } from '../../utils/event';
import { PREF_TO_VIEW, TIMES, CALENDAR_USER_TYPE } from '../../constants/calendars';
import { DEFAULT_NOTIFICATION_DURATION } from '../../constants/notifications';
import ConfirmModalDialog from '../confirm-modal-dialog';
import { USER_ROOT_FOLDER_ID } from '../../constants';
import { RightSideAdSlot } from '../ad-slots';
import isToday from 'date-fns/is_today';
import { configure } from '../../config';
import { isHolidayCalendar } from '../../../src/utils/calendar';

export const MODAL_ACTIONS_HIDDEN_MOBILE = ['printCalendarModal'];

const VIEW_TO_PREF = invert(PREF_TO_VIEW);

const VIEWS = {
	agenda: true,
	day: true,
	week: true,
	work_week: true,
	month: true,
	year: YearView // @TODO Zimbra doesn't support year view
};

import { types as apiClientTypes } from '@zimbra/api-client';
import ZimletSlot from '../zimlet-slot';
const { InviteReplyVerb } = apiClientTypes;

const createInvitationDraft = address => ({
	emailAddresses: [
		{
			address,
			type: 'f'
		}
	],
	mimeParts: [
		{
			contentType: 'text/plain',
			content: ''
		}
	]
});

const getValidAttendees = (attendees = []) =>
	attendees.filter(
		attendee =>
			!isString(attendee) &&
			attendee.address &&
			attendee.calendarUserType !== CALENDAR_USER_TYPE.resource
	);

@withText({
	eventNoTitle: 'calendar.event_no_title',
	declineBody: 'calendar.dialogs.deleteNotificationMessages.declineSingleInstance',
	declineSubject: 'calendar.dialogs.deleteNotificationMessages.declineSubject',
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';

	return {
		formatLT: `${timeFormats}.longDateFormat.LT`,
		formatHour: `${timeFormats}.formatHour`,
		format24HourMinute: 'timeFormats.format24hr.formatHourMinute',
		formatDayLong: 'timeFormats.dateFormats.formatDayLong',
		formatDateYearLong: 'timeFormats.dateFormats.formatDateYearLong',
		formatMonthDayLong: 'timeFormats.dateFormats.formatMonthDayLong',
		formatDateLongMonthMedium: 'timeFormats.dateFormats.formatDateLongMonthMedium',
		formatDayYearLong: 'timeFormats.dateFormats.formatDayYearLong',
		formatMonthYearLong: 'timeFormats.dateFormats.formatMonthYearLong',
		formatDateEmail: 'timeFormats.dateFormats.formatDateEmail'
	};
})
@withProps(
	({
		formatLT,
		formatHour,
		formatDateYearLong,
		formatMonthDayLong,
		formatDayLong,
		formatDateLongMonthMedium,
		formatDayYearLong
	}) => ({
		FORMATS: {
			selectRangeFormat: ({ start, end }) =>
				`${moment(start).format(formatLT)} - ${moment(end).format(formatLT)}`,
			eventTimeRangeFormat: () => null,
			timeGutterFormat: date => moment(date).format(formatHour),
			dayFormat: date => moment(date).format(formatDayLong),
			dayHeaderFormat: date => moment(date).format(formatDateYearLong),
			dayRangeHeaderFormat: ({ start, end }) =>
				`${moment(start).format(formatMonthDayLong)} - ${moment(end).format(
					start.getMonth() !== end.getMonth() ? formatDateLongMonthMedium : formatDayYearLong
				)}`
		}
	})
)
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@configure({ urlSlug: 'routes.slugs.calendar' })
@connect(
	({ calendar = {} }) => ({
		date: calendar.date,
		activeModal: calendar.activeModal
	}),
	{
		setDate: calendarActionCreators.setDate,
		toggleModal: calendarActionCreators.toggleModal,
		notify: notifyActionCreator,
		showNotificationModal: openNotificationModal
	}
)
@graphql(AccountInfoQuery, {
	name: 'accountInfoData'
})
@withProps(({ matchesScreenMd, accountInfoData, actionType }) => {
	const preferences = get(accountInfoData, 'accountInfo.prefs');
	let view = getView({
		preferences
	});

	if (!matchesScreenMd && view === VIEW_WEEK) {
		view = VIEW_DAY;
	}

	return {
		preferencesData: {
			preferences
		},
		view,
		isForwardInvite: actionType === 'forward'
	};
})
@graphql(CalendarsAndAppointmentsQuery, {
	props: ({ data: { getFolder = {}, ...restData } }) => {
		const calendars = [
			...(get(getFolder, 'folders.0.folders') || []),
			...(get(getFolder, 'folders.0.linkedFolders') || [])
		];
		return {
			calendarsData: {
				...restData,
				calendars
			},
			calendarsToSelect: filterNonEditableCalendars(calendars)
		};
	},
	options: ({ date, preferencesData, view }) => {
		if (!preferencesData.preferences) {
			return { skip: true };
		}

		const dayOfTheWeek = getDOW(preferencesData);

		moment.locale(moment.locale(), {
			week: {
				dow: dayOfTheWeek
			}
		});

		let start = new Date(date);
		let end;

		// @TODO drop silly end calcs and use date-fns addWeeks() / addMonths()
		if (view === VIEW_YEAR) {
			// Don't fetch any events when showing a full year (seems to crash zcs)
			return {};
			// start = startOfYear(start);
			// end = endOfYear(start);
		} else if (view === VIEW_MONTH) {
			start = startOfMonth(start);
		} else if (view === VIEW_WEEK) {
			start = startOfWeek(start);
		} else if (view === VIEW_DAY) {
			start = startOfDay(start);
		} else if (view === VIEW_AGENDA) {
			start = startOfMonth(start);
			end = endOfMonth(start);
		}

		return {
			variables: {
				start: start.getTime() - TIMES[view],
				end: (end && end.getTime()) || start.getTime() + TIMES[view] * 3 // @TODO this should work like start's offset
			}
		};
	}
})
@branch(
	({ accountInfoData, preferencesData, calendarsData }) =>
		!accountInfoData.accountInfo ||
		!preferencesData.preferences ||
		!(calendarsData.calendars && calendarsData.calendars.length),
	renderComponent(SkeletonWithSidebar)
)
@withModifyPrefs()
@graphql(CalendarChangeColorMutation, {
	props: ({ ownProps: { calendarsData }, mutate }) => ({
		changeFolderColor: (newId, newColor) =>
			mutate({
				variables: { id: newId, color: Number(newColor) },
				optimisticResponse: {
					changeFolderColor: true
				},
				update: cache => {
					const data = cache.readQuery({ query: CalendarsQuery });
					const folders = get(data, 'getFolder.folders.0.folders');
					const linkedFolders = get(data, 'getFolder.folders.0.linkedFolders');
					let match;

					folders.every(f => {
						if (f.id === newId) {
							f.color = newColor;
							match = true;
							return false;
						}
						return true;
					});

					!match &&
						linkedFolders.every(f => {
							if (f.id === newId) {
								f.color = newColor;
								return false;
							}
							return true;
						});

					cache.writeQuery({ query: CalendarsQuery, data });
				}
			}).then(() => calendarsData.refetch())
	})
})
@graphql(FolderActionMutation, {
	props: ({ ownProps: { calendarsData }, mutate }) => ({
		folderAction: action => {
			// Remove the apollo cache key, which is not a real attribute
			// and is a result of deep cloning. Would like to remove this
			// manual step in the future.
			if (action.grant && action.grant.__typename) {
				delete action.grant.__typename;
			}
			return mutate({ variables: { action } }).then(calendarsData.refetch);
		},
		trashCalendar: id =>
			mutate({
				variables: {
					action: {
						op: 'trash',
						id
					}
				},
				optimisticResponse: {
					__typename: 'Mutation',
					folderAction: true
				},
				update: cache => {
					const data = cache.readQuery({ query: CalendarsQuery });
					const ownedFolders = get(data, 'getFolder.folders.0.folders');

					if (ownedFolders) {
						data.getFolder.folders[0].folders = ownedFolders.filter(folder => folder.id !== id);
					}

					const linkedFolders = get(data, 'getFolder.folders.0.linkedFolders');

					if (linkedFolders) {
						data.getFolder.folders[0].linkedFolders = linkedFolders.filter(
							folder => folder.id !== id
						);
					}

					cache.writeQuery({ query: CalendarsQuery, data });
				}
			}),
		moveCalendar: (id, destFolderId) =>
			mutate({
				variables: {
					action: {
						op: 'move',
						id,
						folderId: destFolderId
					}
				}
			}).then(calendarsData.refetch),
		deleteCalendar: id =>
			mutate({
				variables: {
					action: {
						op: 'delete',
						id
					}
				}
			})
	})
})
@withMoveAppointment()
@withCreateAppointment()
@withModifyAppointment()
@withDeleteAppointment()
@withCreateAppointmentException()
@graphql(SendInviteReply, {
	props: ({ ownProps: { account, declineBody, declineSubject, formatDateEmail }, mutate }) => ({
		declineInviteReply: (invite, replyToSingleInstance) =>
			mutate({
				variables: {
					inviteReply: {
						id:
							replyToSingleInstance || invite.owner
								? invite.inviteId
								: invite.inviteId.split('-')[1],
						componentNum: 0,
						verb: InviteReplyVerb.Decline,
						...(replyToSingleInstance && {
							exceptId: { date: invite.utcRecurrenceId },
							message: {
								emailAddresses: [
									{
										address: invite.organizer.address,
										type: 't'
									}
								].concat(
									invite.owner
										? [
												{
													address: account.name,
													type: 's'
												},
												{
													address: invite.owner,
													type: 'f'
												}
										  ]
										: [
												{
													address: account.name,
													type: 'f'
												}
										  ]
								),
								replyType: 'r',
								subject: declineSubject + invite.name,
								mimeParts: [
									{
										contentType: 'text/plain',
										content: declineBody + moment(invite.date).format(formatDateEmail)
									}
								]
							}
						})
					}
				}
			})
	})
})
export default class Calendar extends Component {
	state = {
		newEvent: null,
		eventToEdit: null,
		quickAddBounds: null,
		showEditModal: false,
		showRecurrenceEditModal: false,
		showRecurrenceDeleteModal: false,
		showInformOrganizerModal: false,
		eventToDelete: null,
		showconfirmDeleteModal: false
	};

	getEventName = event => {
		const eventPermissions = get(event, 'permissions', '');
		if (eventPermissions && event.class === 'PRI') {
			if (eventPermissions.includes('p')) return event.name || this.props.eventNoTitle;
			return '';
		}
		return event.name || this.props.eventNoTitle;
	};
	getIntTime = time => {
		const { formatLT, format24HourMinute } = this.props;
		return parseInt(switchTimeFormat(time, formatLT, format24HourMinute), 10);
	};

	getSlotProps = time => {
		let className = style.afterHours;
		const { preferencesData, view, format24HourMinute, formatLT } = this.props;
		const hoursObject = getWorkingHours(preferencesData);
		const hourObject = hoursObject[time.getDay() + 1];

		if (hourObject.enabled) {
			const businessHoursStart = this.getIntTime(moment(hourObject.start).format(formatLT)),
				businessHoursEnd = this.getIntTime(moment(hourObject.end).format(formatLT)),
				hour = moment(time).format(format24HourMinute);

			className =
				hour >= businessHoursStart && hour < businessHoursEnd
					? view !== VIEW_DAY && isToday(time)
						? style.today
						: style.businessHours
					: style.afterHours;
		}
		return { className };
	};

	selectSlot = ({ start, end }) => {
		const allDay = start === end,
			{ calendarsToSelect } = this.props,
			defaultCalId = get(this.props, 'preferencesData.preferences.zimbraPrefDefaultCalendarId');

		let folderId = defaultCalId && defaultCalId.toString();
		const defaultExists = calendarsToSelect.find(({ id }) => id === folderId);
		if (!defaultExists) folderId = calendarsToSelect[0].id;

		const color = colorForCalendar(defaultExists || calendarsToSelect[0]);

		this.setState({
			newEvent: {
				allDay,
				new: true,
				location: '',
				start,
				end: allDay
					? moment(end)
							.endOf('day')
							.valueOf()
					: end,
				alarms: [newAlarm()],
				onRender: this.handleQuickAddRender,
				folderId,
				color
			}
		});
	};

	handleCreateNewEvent = () => {
		const { urlSlug } = this.props;
		this.createNewEvent();
		route(`/${urlSlug}/${ROUTE_EVENT}/${ROUTE_NEW}`);
	};

	createNewEvent = () => {
		const now = moment();
		const start =
			now.minutes() >= 29
				? now.endOf('hour').add(1, 'second')
				: now.startOf('hour').add(30, 'minutes');

		this.selectSlot({
			start: start.toDate(),
			end: start.add(30, 'minutes').toDate()
		});
	};

	handleCloseAddEvent = () => {
		this.clearEditEvent();
		this.clearNewEvent();
		route(`/${this.props.urlSlug}`);
	};

	handleCloseModal = () => {
		this.setState({
			showRecurrenceEditModal: false,
			showRecurrenceDeleteModal: false,
			showInformOrganizerModal: false,
			showconfirmDeleteModal: false,
			eventToEdit: null
		});
	};

	handleRecurrenceSelection = (event, editInstance = false) => {
		this.handleCloseModal();
		this.editEvent(event, editInstance, true);
	};

	deleteAppointment = (event, editInstance = false, notifyOrganizer = false) => {
		this.handleCloseModal();
		let message;
		const {
			draft,
			isOrganizer,
			inviteId,
			folderId,
			organizer: { address }
		} = event;
		const {
			declineInviteReply,
			moveAppointment,
			calendarsData,
			deleteAppointment,
			notify,
			showNotificationModal
		} = this.props;
		if (draft) {
			message = createInvitationDraft(address);
		}
		if (editInstance) {
			if (isOrganizer) {
				this.setState({
					showconfirmDeleteModal: true
				});
			} else {
				this.deleteSingleInstance(event, notifyOrganizer);
			}
		} else {
			if (!isOrganizer && notifyOrganizer) {
				declineInviteReply(event);
			}
			deleteAppointment({
				inviteId,
				...(draft && { message: { message } })
			})
				.then(() => {
					notify({
						message: <Text id="calendar.dialogs.deleteNotificationMessages.appointmentTrashed" />,
						...((isOrganizer || (!isOrganizer && !notifyOrganizer)) && {
							action: {
								label: <Text id="buttons.undo" />,
								fn: () => {
									moveAppointment({
										calendarItemId: parseInt(inviteId.split('-')[0], 10),
										destFolderId: folderId
									}).then(() => {
										calendarsData.refetch();
										notify({
											message: (
												<Text id="calendar.dialogs.deleteNotificationMessages.appointmentRestored" />
											)
										});
									});
								}
							}
						})
					});
				})
				.catch(err => {
					console.error(err);
					showNotificationModal({
						message: err
					});
				});
		}
	};

	deleteSingleInstance = (event, notifyOrganizer) => {
		this.handleCloseModal();
		const {
			draft,
			inviteId,
			utcRecurrenceId,
			isOrganizer,
			start,
			name,
			organizer: { address }
		} = event;
		const { declineInviteReply, deleteAppointment, notify, showNotificationModal } = this.props;
		const eventToDelete = {
			inviteId,
			date: { date: utcRecurrenceId }
		};
		if (!isOrganizer) {
			eventToDelete.start = {
				start: Math.round(start / 1000)
			};
			eventToDelete.message = {
				message: {
					emailAddresses: [],
					subject:
						<Text id="calendar.dialogs.deleteNotificationMessages.cancelAppointment" /> + name,
					mimeParts: [
						{
							content:
								<Text id="calendar.dialogs.deleteNotificationMessages.cancelSingleInstance" /> +
								start,
							contentType: 'text/plain'
						}
					]
				}
			};
			notifyOrganizer && declineInviteReply(event, true);
		} else if (draft) {
			eventToDelete.message = {
				message: createInvitationDraft(address)
			};
		}
		deleteAppointment(eventToDelete)
			.then(() => {
				notify({
					message: <Text id="calendar.dialogs.deleteNotificationMessages.appointmentTrashed" />
				});
			})
			.catch(err => {
				console.error(err);
				showNotificationModal({
					message: err
				});
			});
	};

	clearEditEvent = () => {
		this.setState({
			eventToEdit: null,
			editInstance: false,
			showRecurrenceEditModal: false
		});
	};

	clearNewEvent = () => {
		if (this.state.newEvent || this.state.quickAddBounds) {
			this.setState({
				newEvent: null,
				quickAddBounds: null
			});
		}
	};

	closeActiveModal = () => {
		this.props.toggleModal({
			modalType: null,
			modalProps: null
		});
	};

	openModal = (modalType, modalProps) => {
		this.props.toggleModal({
			modalType,
			modalProps
		});
	};

	selectEvent = event => {
		const { matchesScreenMd, view } = this.props;
		if (!matchesScreenMd) {
			if (view !== PREF_TO_VIEW.day) {
				// On phone in Month view, navigate to the day of the event.
				this.handleNavigate(event.date);
				this.handleSetView('day');
			} else {
				this.openModal(MODAL_ACTIONS.eventDetails, {
					event,
					onEdit: this.editEvent,
					onDelete: this.deleteEvent
				});
			}
		}
	};
	savedEvents = () => {
		const appointments = this.getVisibleAppointmentsData();
		const savedEvents = flatMap(appointments, appointment =>
			appointment.instances
				? appointment.instances.map(instance =>
						// Use exception data if available
						instance.isException
							? {
									...instance,
									date: new Date(instance.start),
									color: appointment.color,
									...(appointment.permissions && { permissions: appointment.permissions }),
									folderId: appointment.folderId,
									parentFolderName: appointment.parentFolderName,
									calendarId: appointment.calendarId
							  }
							: {
									...appointment,
									date: new Date(instance.start),
									utcRecurrenceId: instance.utcRecurrenceId
							  }
				  )
				: {
						...appointment,
						date: new Date(appointment.date)
				  }
		).map(event => ({
			...event,
			start: event.allDay
				? moment(event.date)
						.startOf('day')
						.toDate()
				: event.date,
			end: event.allDay
				? addMilliseconds(
						moment(event.date)
							.startOf('day')
							.toDate(),
						event.duration
				  )
				: addMilliseconds(event.date, event.duration)
		}));
		return savedEvents;
	};

	routeEditEvent = savedEvents => {
		const { newEvent, eventToEdit } = this.state;
		const { id, type, isForwardInvite } = this.props;
		const events = newEvent ? [...savedEvents, newEvent] : savedEvents;

		if (!eventToEdit && id) {
			if (isForwardInvite) {
				this.editEvent(
					{
						inviteId: id
					},
					false,
					true
				);
			} else {
				const editEventsData = events.find(data =>
					data.owner ? data.inviteId === id : data.inviteId.split('-')[1] === id
				);
				if (editEventsData.isRecurring && type === 'all') {
					this.editEvent(editEventsData, false, true);
				} else if (editEventsData.isRecurring && type === 'single') {
					this.editEvent(editEventsData, true, true);
				} else {
					this.editEvent(editEventsData);
				}
			}
		}
	};

	editEvent = (event, editInstance = false, skipRecurrenceCheck = false) => {
		const { urlSlug, id, createEvent } = this.props;
		const { permissions, isRecurring, isException } = event;

		// Close event details modal
		this.closeActiveModal();

		if (event.class === 'PRI' && permissions && !permissions.includes('p')) {
			return;
		}

		if (permissions && !permissions.includes('w')) {
			return;
		}

		// For recurring events, confirm scope of editing
		if (isRecurring && !isException) {
			if (skipRecurrenceCheck !== true) {
				this.setState({
					showRecurrenceEditModal: true,
					eventToEdit: event
				});

				return;
			}

			// Get main recurring event from data instead of instance
			if (editInstance !== true) {
				const appointments = this.getVisibleAppointmentsData();
				const appointment = appointments.find(app => app.inviteId === event.inviteId);

				if (appointment) {
					this.setState({
						eventToEdit: {
							...appointment,
							start: new Date(appointment.date),
							end: addMilliseconds(new Date(appointment.date), appointment.duration)
						}
					});
				}
				if (!id) {
					event.inviteId &&
						route(
							`/${urlSlug}/${ROUTE_EVENT}/${ROUTE_EDIT}/${
								event.owner ? event.inviteId : event.inviteId.split('-')[1]
							}/${ROUTE_ALL}`
						);
				}
			} else {
				this.setState({
					eventToEdit: event,
					editInstance
				});
				if (!id) {
					event.inviteId &&
						route(
							`/${urlSlug}/${ROUTE_EVENT}/${ROUTE_EDIT}/${
								event.owner ? event.inviteId : event.inviteId.split('-')[1]
							}/${ROUTE_SINGLE}`
						);
				}
			}

			this.setState({
				eventToEdit: event
			});
			return;
		}

		this.setState({
			eventToEdit: event
		});
		if (!id && !createEvent) {
			if (event.inviteId) {
				route(
					`/${urlSlug}/${ROUTE_EVENT}/${ROUTE_EDIT}/${
						event.owner ? event.inviteId : event.inviteId.split('-')[1]
					}`
				);
			} else {
				route(`/${urlSlug}/${ROUTE_EVENT}/${ROUTE_NEW}`);
				this.handleCancelAdd();
			}
		}
	};

	deleteEvent = event => {
		if (event.isRecurring) {
			this.setState({
				showRecurrenceDeleteModal: true,
				eventToDelete: event
			});
		} else if (event.isOrganizer) {
			this.setState({
				showRecurrenceDeleteModal: false
			});
			this.deleteAppointment(event);
		} else {
			this.setState({
				showRecurrenceDeleteModal: false,
				showInformOrganizerModal: true,
				eventToDelete: event
			});
		}
	};

	handleQuickAddRender = ({ bounds }) => {
		// Called on render of the QuickAddPopover, avoid infinite loops
		if (this.state.quickAddBounds && shallowEqual(this.state.quickAddBounds, bounds)) {
			return;
		}

		this.setState({
			quickAddBounds: bounds
		});
	};

	showUpdateAppointmnetNotification = (attendees, allInviteesRemoved) => {
		const { notify: notifyAction } = this.props;
		// Special case to use allInviteesRemoved flag:
		// This toast should pop up when only remaining valid attendee is removed and we want to indicate user that cancellation mail has been sent to it.
		(getValidAttendees(attendees).length || allInviteesRemoved) &&
			notifyAction({
				message: <Text id="calendar.editModal.notifications.eventUpdate" />
			});
	};

	showEventSaveSendNotification = appointment => {
		const { attendees, isDraft, isQuickAddEvent } = appointment;
		const validAttendeeCount = getValidAttendees(attendees).length;
		const messageId =
			isDraft || (!isQuickAddEvent && validAttendeeCount === 0)
				? 'calendar.editModal.notifications.eventSaved'
				: 'calendar.editModal.notifications.eventSent';
		const { notify: notifyAction } = this.props;
		notifyAction({
			message: <Text id={messageId} plural={validAttendeeCount} />
		});
	};

	showEventActionsNotifications = (appointment, allInviteesRemoved) => {
		const { attendees, neverSent, isDraft } = appointment;
		neverSent || isDraft
			? this.showEventSaveSendNotification(appointment)
			: attendees && this.showUpdateAppointmnetNotification(attendees, allInviteesRemoved);
	};

	handleAppointmentSave = (
		appointment,
		folderIdShared,
		accountName,
		destinationCalId,
		isFormDirty,
		allInviteesRemoved
	) => {
		const { attendees, locations, neverSent } = appointment;

		// Remove temporary flags from attendee and location
		attendees &&
			(appointment.attendees = attendees.map(attendee =>
				omit(attendee, ['isGalContact', 'thumbnailPhoto'])
			));
		locations &&
			(appointment.locations = locations.map(location =>
				isString(location)
					? location
					: omit(location, ['isGalContact', 'thumbnailPhoto', 'id', 'attributes'])
			));

		if (appointment.new) {
			this.handleCreateAppointment(appointment, folderIdShared, accountName);
		} else if (appointment.editInstance) {
			this.handleCreateAppointmentException(appointment, folderIdShared, accountName);
		} else if (isFormDirty || neverSent) {
			// Do not make API request if no change has been made to already saved appointment.
			this.handleEditAppointment(
				appointment,
				folderIdShared,
				accountName,
				destinationCalId,
				allInviteesRemoved
			);
		}

		this.handleCloseAddEvent();
	};

	handleEditAppointment = (
		appointment,
		folderIdShared,
		accountName,
		destinationCalId,
		allInviteesRemoved
	) => {
		this.props
			.modifyAppointment(appointment, folderIdShared, accountName)
			.then(res => {
				if (destinationCalId) {
					const {
						calendarsData: { calendars },
						moveAppointment
					} = this.props;
					const calendar = calendars.find(cal => cal.id === destinationCalId);
					moveAppointment({
						calendarItemId: get(res, 'data.modifyAppointment.calendarItemId'),
						destFolderId: calendar.id
					});
				}
				this.showEventActionsNotifications(appointment, allInviteesRemoved);
			})
			.catch(err => {
				console.error(err);

				this.props.notify({
					failure: true,
					message: get(err, 'message').match(/permission denied/g) ? (
						<Text id="calendar.editModal.notifications.permissionDenied" />
					) : (
						<Text id="calendar.editModal.notifications.problemInModifying" />
					)
				});
			});
	};

	handleCreateAppointmentException = (appointment, folderIdShared, accountName) => {
		appointment.exceptId = appointment.utcRecurrenceId;
		const { createAppointmentException } = this.props;

		createAppointmentException(appointment, folderIdShared, accountName)
			.then(() => {
				this.showEventActionsNotifications(appointment);
			})
			.catch(err => {
				console.error(err);

				this.props.notify({
					failure: true,
					message: <Text id="calendar.editModal.notifications.problemInCreating" />
				});
			});
	};

	handleCreateAppointment = (appointment, folderIdShared, accountName) => {
		const { createAppointment } = this.props;
		createAppointment(
			{
				name: '',
				...appointment
			},
			folderIdShared,
			accountName
		)
			.then(() => {
				this.showEventSaveSendNotification(appointment);
			})
			.catch(err => {
				console.error(err);

				this.props.notify({
					failure: true,
					message: <Text id="calendar.editModal.notifications.problemInCreating" />,
					action: {
						label: <Text id="calendar.editModal.notifications.tryAgain" />,
						fn: () => {
							this.handleCreateNewEvent();
						}
					}
				});
			});
	};

	handleCancelAdd = () => {
		this.clearNewEvent();
	};

	handleNavigate = payload => {
		this.clearNewEvent();
		if (!isSameDay(this.props.date, payload)) {
			this.props.setDate(payload);
		}
	};

	handleSetView = view => {
		const viewPref = VIEW_TO_PREF[view];
		if (viewPref) {
			this.clearNewEvent();
			this.props.modifyPrefs({
				zimbraPrefCalendarInitialView: viewPref
			});
		}
	};

	handleQuickAddMoreDetails = event => {
		this.setState({
			newEvent: event
		});
		this.editEvent(event);
	};

	getVisibleAppointmentsData = () => {
		const {
			calendarsData,
			account: { zimlets }
		} = this.props;
		const isHolidayZimletEnabled = find(
			zimlets.zimlet,
			zimlet => get(zimlet, 'zimlet.0.name') === 'zm-x-zimlet-holiday-calendar'
		);
		const checkedCalendars =
			calendarsData && calendarsData.calendars
				? calendarsData.calendars.filter(calendar =>
						isHolidayZimletEnabled
							? hasFlag(calendar, 'checked')
							: hasFlag(calendar, 'checked') && !isHolidayCalendar(calendar)
				  )
				: [];

		return flatMap(checkedCalendars, c => {
			if (c.appointments) {
				const appointments =
					c.permissions && c.permissions.includes('f')
						? c.appointments.appointments.filter(
								appointment =>
									appointment.freeBusyActual &&
									(appointment.freeBusyActual.includes('F') ||
										appointment.freeBusyActual.includes('B'))
						  )
						: c.appointments.appointments;
				return appointments.map(appointment => ({
					...appointment,
					parentFolderName: c.name,
					color: colorForCalendar(c),
					...(c.permissions && { permissions: c.permissions }),
					owner: c.owner,
					calendarId: c.id
				}));
			}
			return [];
		});
	};

	handleBeginSelectEvent = () => {
		this.clearNewEvent();
	};

	handleTrashCalendar = (item, isUnlink = false) => {
		const { id, name, acl } = item;
		if ((get(acl, 'grant') || []).length) {
			const aclConfirmHandler = isYes => {
				this.closeActiveModal();
				if (isYes) {
					this.handleDeleteCalendar(id, name, isUnlink);
				}
			};
			const children = <Text id="calendar.dialogs.sharedDeleteWarningDialog.DIALOG_WARNING" />;
			this.openModal(MODAL_ACTIONS.confirmDeleteModal, {
				children,
				onResult: aclConfirmHandler,
				cancelButton: false,
				title: 'calendar.dialogs.sharedDeleteWarningDialog.DIALOG_TITLE'
			});
		} else {
			this.handleDeleteCalendar(id, name, isUnlink);
		}
	};

	handleDeleteCalendar = (id, name, isUnlink) => {
		const { moveCalendar, deleteCalendar, trashCalendar, notify } = this.props;

		trashCalendar(id).then(() => {
			const timer = setTimeout(() => {
				deleteCalendar(id);
			}, DEFAULT_NOTIFICATION_DURATION * 1000);

			notify({
				message: (
					<Text
						id={`calendar.notifications.${isUnlink ? 'unlinkShared' : 'calendarDeleted'}`}
						fields={{ calendarName: name }}
					/>
				),
				action: {
					label: <Text id="buttons.undo" />,
					fn: () => {
						clearTimeout(timer);

						moveCalendar(id, USER_ROOT_FOLDER_ID).then(() => {
							notify({
								message: <Text id="calendar.notifications.calendarRestored" />
							});
						});
					}
				}
			});
		});
	};

	getQuickAddPopoverStyles = quickAddBounds =>
		this.props.matchesScreenMd
			? {
					left: quickAddBounds.left + quickAddBounds.width / 2,
					top: quickAddBounds.top
			  }
			: {
					left: window.innerWidth / 2,
					top: window.innerHeight / 2,
					transform: 'translateX(-50%) translateY(-50%)'
			  };

	static defaultProps = {
		businessHoursStart: 8,
		businessHoursEnd: 17
	};

	constructor(props) {
		super(props);
		BigCalendar.setLocalizer(BigCalendar.momentLocalizer(moment));

		// BigCalendar passes through only whitelisted props, we can circumvent
		// to pass through components bound to component methods. You could
		// also e.g. rebind on render if necessary.
		this.BIG_CALENDAR_COMPONENTS = {
			toolbar: withProps({
				openModal: this.openModal,
				setView: this.handleSetView,
				calendarsData: props.calendarsData,
				folderAction: props.folderAction,
				matchesScreenMd: props.matchesScreenMd,
				getCalendarType: props.getCalendarType
			})(CalendarToolbar),
			dateHeader: CalendarDateHeader,
			eventWrapper: CalendarEventWrapper,
			event: withProps({
				view: props.view,
				onEdit: this.editEvent,
				onDelete: this.deleteEvent
			})(CalendarEvent)
		};
		this.MODALS = {
			[MODAL_ACTIONS.createCalendar]: {
				Component: CreateCalendarModal,
				props: () => ({
					calendarsData: this.props.calendarsData,
					refetchCalendars: this.props.calendarsData.refetch
				})
			},
			[MODAL_ACTIONS.createSharedCalendar]: {
				Component: CreateSharedCalendarModal,
				props: () => ({
					validateNewSharedCalendar: sharedCalendar =>
						!some(
							this.props.calendarsData.calendars,
							({ name }) => name.toLowerCase() === sharedCalendar.name.toLowerCase()
						),
					onRefetchCalendars: this.props.calendarsData.refetch,
					providerName:
						this.props.accountInfoData.accountInfo &&
						this.props.accountInfoData.accountInfo.publicURL &&
						this.props.accountInfoData.accountInfo.publicURL.split(/http:\/\/|https:\/\//)[1]
				})
			},
			[MODAL_ACTIONS.eventDetails]: {
				Component: CalendarEventDetailsModal,
				props: () => ({
					onEdit: this.editEvent,
					onDelete: this.deleteEvent
				})
			},
			[MODAL_ACTIONS.importCalendarModal]: {
				Component: ImportCalendarModal,
				props: () => ({
					onRefetchCalendars: this.props.calendarsData.refetch
				})
			},
			[MODAL_ACTIONS.exportCalendarModal]: {
				Component: ExportCalendarModal,
				props: () => ({})
			},
			[MODAL_ACTIONS.printCalendarModal]: {
				Component: PrintCalendarModal,
				props: () => ({
					refetchCalendars: this.props.calendarsData.refetch,
					calendarsData: this.props.calendarsData,
					view: this.props.view,
					currentDate: this.props.date,
					businessHoursStart: props.businessHoursStart,
					businessHoursEnd: props.businessHoursEnd
				})
			},
			[MODAL_ACTIONS.confirmDeleteModal]: {
				Component: ConfirmModalDialog
			}
		};
	}

	componentWillMount() {
		const { id, createEvent, event } = this.props;

		if (createEvent) {
			this.clearEditEvent();
			this.clearNewEvent();
			this.createNewEvent();
		} else if (id) {
			this.clearEditEvent();
			this.clearNewEvent();
			!event ? this.routeEditEvent(this.savedEvents()) : this.editEvent();
		}
	}

	componentWillReceiveProps({ createEvent, view }) {
		if (createEvent !== this.props.createEvent && createEvent) {
			this.createNewEvent();
		}

		if (view !== this.props.view) {
			this.BIG_CALENDAR_COMPONENTS.event = withProps({
				view,
				onEdit: this.editEvent,
				onDelete: this.deleteEvent
			})(CalendarEvent);
		}
	}

	render(
		{
			view,
			date,
			calendarsData,
			pending,
			matchesScreenMd,
			folderAction,
			checkCalendar,
			changeFolderColor,
			notify,
			showNotificationModal,
			activeModal,
			calendarsToSelect,
			accountInfoData,
			preferencesData,
			id,
			createEvent,
			FORMATS,
			isForwardInvite,
			intl
		},
		{
			newEvent,
			eventToEdit,
			quickAddBounds,
			activeModalProps,
			showRecurrenceEditModal,
			showRecurrenceDeleteModal,
			showInformOrganizerModal,
			eventToDelete,
			showconfirmDeleteModal
		}
	) {
		if (!view) {
			return null;
		}
		const showEditView = id || createEvent;
		const savedEvents = this.savedEvents();

		const events = newEvent ? [...savedEvents, newEvent] : savedEvents;
		const modal = cloneDeep(find(this.MODALS, (_, key) => key === activeModal.modalType));
		const mobileHiddenModal = MODAL_ACTIONS_HIDDEN_MOBILE.filter(
			item => item === activeModal.modalType
		);
		const inviteTemplate = get(intl, 'dictionary.calendar.invite');

		if (modal && (matchesScreenMd || (!matchesScreenMd && mobileHiddenModal.length === 0))) {
			const modalProps = modal.props ? modal.props() : {};
			// Enable modals to set custom onClose, onSubmit handlers, but
			// pipe into our modal visibility state handler.
			modalProps.onAction = modalProps.onAction
				? flow(
						modalProps.onAction,
						this.closeActiveModal
				  )
				: this.closeActiveModal;
			modalProps.onClose = modalProps.onClose
				? flow(
						modalProps.onClose,
						this.closeActiveModal
				  )
				: this.closeActiveModal;
			modal.props = modalProps;
		} else if (modal) this.closeActiveModal();

		const quickAddPopoverStyles =
			newEvent &&
			quickAddBounds &&
			!showEditView &&
			!showRecurrenceEditModal &&
			this.getQuickAddPopoverStyles(quickAddBounds);

		return (
			<div class={cx(style.calendar, pending && style.loading, style[view + 'View'])}>
				<CalendarSidebar
					view={view}
					date={date}
					calendarsAndAppointmentsData={calendarsData}
					accountInfoData={this.props.accountInfoData}
					onNavigate={this.handleNavigate}
					onCreateNew={this.handleCreateNewEvent}
					openModal={this.openModal}
					matchesScreenMd={matchesScreenMd}
					changeFolderColor={changeFolderColor}
					checkCalendar={checkCalendar}
					trashCalendar={this.handleTrashCalendar}
					folderAction={folderAction}
				/>

				{showEditView && (
					<AppointmentEditEvent
						className={style.calendarInner}
						event={eventToEdit || newEvent}
						onAction={this.handleAppointmentSave}
						onClose={this.handleCloseAddEvent}
						calendars={calendarsToSelect}
						matchesScreenMd={matchesScreenMd}
						preferencesData={preferencesData}
						accountInfoData={accountInfoData}
						{...activeModal.modalProps}
						editInstance={this.state.editInstance}
						{...activeModalProps}
						isForwardInvite={isForwardInvite}
						inviteTemplate={inviteTemplate}
						createEvent={createEvent}
					/>
				)}

				{showRecurrenceEditModal && (
					<RecurrenceEditModal
						event={eventToEdit}
						onClose={this.handleCloseModal}
						onAction={this.handleRecurrenceSelection}
					/>
				)}

				{showRecurrenceDeleteModal && (
					<RecurrenceDeleteModal
						event={eventToDelete}
						onClose={this.handleCloseModal}
						onAction={this.deleteAppointment}
					/>
				)}

				{showInformOrganizerModal && (
					<InformOrganizer
						onClose={this.handleCloseModal}
						event={eventToDelete}
						onAction={this.deleteAppointment}
						deleteSingleInstance={this.deleteSingleInstance}
					/>
				)}

				{showconfirmDeleteModal && (
					<ConfirmDelete
						onClose={this.handleCloseModal}
						event={eventToDelete}
						deleteSingleInstance={this.deleteSingleInstance}
					/>
				)}

				{!showEditView && (
					<div className={style.calendarWrapper}>
						<div class={style.calendarInnerWrapper}>
							<ZimletSlot name="top-mail-ad-item" props class={style.listTopper} />
							<BigCalendar
								className={style.calendarInnerBigCal}
								formats={FORMATS}
								components={this.BIG_CALENDAR_COMPONENTS}
								views={VIEWS}
								elementProps={{ className: style.calendarInnerBigCal }}
								eventPropGetter={getEventProps}
								slotPropGetter={this.getSlotProps}
								view={view}
								date={date}
								events={events.filter(isParticipatingInEvent)}
								titleAccessor={this.getEventName}
								tooltipAccessor={this.getEventName}
								allDayAccessor="allDay"
								// @TODO: scrollToTime happens on any re-render of Big Calendar
								// which causes various issues with manipulation and is disabled
								// until a fix is available.
								// scrollToTime={isToday(date) ? new Date() : null}
								popup={false}
								selectable="ignoreEvents"
								onNavigate={this.handleNavigate}
								onView={this.handleSetView}
								onSelectSlot={this.selectSlot}
								onSelectEvent={this.selectEvent}
								onDoubleClickEvent={this.editEvent}
							/>
						</div>
						{matchesScreenMd && (
							<CalendarRightbar class={style.rightbar} accountInfoData={accountInfoData} />
						)}
						<CalendarSectionToolbar onCreateNewEvent={this.handleCreateNewEvent} />
					</div>
				)}

				{newEvent && quickAddBounds && !showEditView && !showRecurrenceEditModal && (
					<QuickAddEventPopover
						event={newEvent}
						onSubmit={this.handleAppointmentSave}
						onAddMoreDetails={this.handleQuickAddMoreDetails}
						onClose={this.handleCancelAdd}
						style={quickAddPopoverStyles}
						isLocation
					/>
				)}
				{modal && (
					<modal.Component
						changeFolderColor={changeFolderColor}
						trashCalendar={this.handleTrashCalendar}
						folderAction={folderAction}
						notify={notify}
						showNotificationModal={showNotificationModal}
						{...modal.props}
						{...activeModal.modalProps}
						onClose={this.closeActiveModal}
					/>
				)}
				<RightSideAdSlot />
			</div>
		);
	}
}
