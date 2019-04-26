import { h, Component } from 'preact';
import { Localizer, Text, withText } from 'preact-i18n';
import moment from 'moment';
import get from 'lodash-es/get';
import omit from 'lodash-es/omit';
import partition from 'lodash-es/partition';
import isString from 'lodash-es/isString';
import { Button, Icon, Select, Option, ChoiceInput } from '@zimbra/blocks';
import cx from 'classnames';
import { newAlarm, hasEmailAlarm, hasDisplayAlarm } from '../../../utils/event';
import { getPrimaryAccountAddress } from '../../../utils/account';
import { addressFromContact, displayAddress } from '../../../utils/contacts';
import { withStateHandlers, branch, renderNothing } from 'recompose';
import { callWith } from '@zimbra/util/src/call-with';

import FormGroup from '../../form-group';
import TextInput from '../../text-input';
import Textarea from '../../textarea';
import DateInput from '../../date-input';
import TimeInput from '../../time-input';
import SelectOption from '../../select';
import AlignedForm from '../../aligned-form';
import AlignedLabel from '../../aligned-form/label';
import AddressField from '../../address-field';
import ActionMenu, { DropDownWrapper } from '../../action-menu';
import ActionMenuGroup from '../../action-menu-group';
import ActionMenuItem from '../../action-menu-item';
import AvailabilityIndicator from '../../availability-indicator';
import ContactPicker from '../../contact-picker';
import CustomRecurrenceModal from './custom-recurrence-modal';
import chooseFiles from 'choose-files';
import AttachmentGrid from '../../attachment-grid';
import AppointmentEditToolbar from './appointment-edit-toolbar';
import wire from 'wiretie';
import { notify } from '../../../store/notifications/actions';
import s from './style.less';
import {
	ATTENDEE_ROLE,
	PARTICIPATION_STATUS,
	CALENDAR_USER_TYPE,
	CALENDAR_TYPE,
	CALENDAR_IDS
} from '../../../constants/calendars';
import { USER_FOLDER_IDS } from '../../../constants';
import CalendarOptionItem from './calendar-option-item';
import withMediaQuery from '../../../enhancers/with-media-query';
import { maxWidth, screenXs } from '../../../constants/breakpoints';
import { filterNonInsertableCalendars } from '../../../utils/calendar';
import CloseButton from '../../close-button';

import {
	withAppointmentData,
	appointmentBody,
	createLocationPayload
} from '../../../graphql-decorators/calendar';
import withAccountInfo from '../../../graphql-decorators/account-info';
import { connect } from 'preact-redux';
import { parseAddress, deepClone, isValidEmail, getEmail } from '../../../lib/util';
import { hasAttachmentPreview, encodeAttachment } from '../../../utils/attachments';
import { cloneWithoutTypeName } from '../../../graphql/utils/graphql';
import isEmpty from 'lodash-es/isEmpty';
import ConfirmModalDialog from '../../confirm-modal-dialog';
import ModalDialog from '../../modal-dialog';
import InEventNotification from './in-event-notification';
import Recurrence from '../../recurrence';
import CaptureBeforeUnload from './../../capture-before-unload';
import ForwardAppointmentInvite from '../../../graphql/mutations/forward-appointment-invite.graphql';
import { graphql } from 'react-apollo';
import { route } from 'preact-router';

const REMIND_OPTIONS = [
	'never',
	'0s',
	'1m',
	'5m',
	'10m',
	'15m',
	'30m',
	'45m',
	'60m',
	'2h',
	'3h',
	'4h',
	'5h',
	'18h',
	'1d',
	'2d',
	'3d',
	'4d',
	'1w',
	'2w'
];

const INTERVAL_SHORTHAND_MAP = {
	s: 'seconds',
	m: 'minutes',
	h: 'hours',
	d: 'days',
	w: 'weeks'
};

const SHOW_AS_OPTIONS = ['F', 'T', 'B', 'O'];
const REPEAT_OPTIONS = ['NONE', 'DAI', 'WEE', 'MON', 'YEA'];

function remindValueFor(relativeTrigger) {
	return (
		(relativeTrigger.weeks && `${relativeTrigger.weeks}w`) ||
		(relativeTrigger.days && `${relativeTrigger.days}d`) ||
		(relativeTrigger.hours && `${relativeTrigger.hours}h`) ||
		(typeof relativeTrigger.minutes === 'number' && `${relativeTrigger.minutes}m`) ||
		(typeof relativeTrigger.seconds === 'number' && `${relativeTrigger.seconds}s`)
	);
}

const DesktopHeading = ({ title, onClose, field }) => (
	<div class={s.header}>
		<h2>
			<Text id={title} fields={{ organizerName: field }} />
		</h2>
		<CloseButton class={s.actionButton} onClick={onClose} />
	</div>
);

const MobileHeading = ({ title, field }) => (
	<div class={s.simpleHeader}>
		<h2>
			<Text id={title} fields={{ organizerName: field }} />
		</h2>
	</div>
);

@withMediaQuery(maxWidth(screenXs), 'matchesScreenXs')
@wire('zimbra', {}, zimbra => ({
	attach: zimbra.attachment.upload
}))
@withText({
	errorMsg: 'calendar.editModal.FILE_SIZE_EXCEEDED'
})
@withStateHandlers(
	{
		showContactPicker: false,
		showCustomRecurrenceModal: false
	},
	{
		onOpenContactPicker: () => () => ({ showContactPicker: true }),
		onCloseContactPicker: () => () => ({ showContactPicker: false }),
		onOpenCustomRecurrenceModal: () => () => ({ showCustomRecurrenceModal: true }),
		onCloseCustomRecurrenceModal: () => () => ({ showCustomRecurrenceModal: false })
	}
)
@withAppointmentData()
@withAccountInfo(({ data: { accountInfo } }) => ({
	primaryAddress: accountInfo && getPrimaryAccountAddress(accountInfo)
}))
@branch(
	({ isForwardInvite, appointmentData }) =>
		isForwardInvite && (appointmentData && appointmentData.loading),
	renderNothing
)
@connect(
	state => ({
		isOffline: get(state, 'network.isOffline'),
		prevLocation: get(state, 'url.prevLocation.pathname')
	}),
	{ notify }
)
@graphql(ForwardAppointmentInvite, {
	props: ({ mutate }) => ({
		forwardAppointmentInvite: appointmentInvite =>
			mutate({
				variables: { appointmentInvite }
			})
	})
})
export default class AppointmentEditEvent extends Component {
	state = {
		event: null,
		remindValue: 'never',
		remindDesktop: true,
		remindEmail: false,
		repeatValue: 'NONE',
		showAsValue: 'B',
		isPrivate: false,
		isChoosingAttachments: false,
		notes: '',
		attendees: [],
		forwardAttendees: [],
		attachments: [],
		aidArr: [],
		isErrored: false,
		locations: [],
		showSendInviteModal: false,
		isDraft: false,
		neverSent: false,
		isOrganizer: false,
		isFormDirty: false,
		showDiscardChangeModal: false,
		showInEventNotification: false,
		pausedBeforeUnload: false,
		allInviteesRemoved: false,
		customSettingChanged: false
	};
	//To store the reference of handleAfterUnload which is getting used in CaptureBeforeUnload
	handleAfterUnload = null;

	/**
	 * @param {object} [baseEnd]	The end time of the appointment, should come from eveng obj or comp obj
	 * @return {moment}				Returns rounded
	 */
	roundToNearestMinute = baseEndTime => {
		const seconds = baseEndTime.getSeconds();
		return seconds >= 30
			? moment(baseEndTime)
					.add(60 - seconds, 's')
					.toDate()
			: moment(baseEndTime).toDate();
	};

	setEvent = ({ event, appointmentData, calendars }) => {
		// appointmentData will be available when MsgRequest is completed
		const message = get(appointmentData, 'message');
		const comp = cloneWithoutTypeName(get(message, 'invitations.0.components.0'));
		const attendees = get(comp, 'attendees') || get(event, 'attendees') || [];
		const locations = get(comp, 'location') || get(event, 'locations') || [];
		const extractedLocations = this.extractLocationPayload(locations, attendees);
		const isDraft = get(comp, 'draft') || get(event, 'draft');
		let neverSent = get(comp, 'neverSent') || get(event, 'neverSent');
		let alarms, trigger;
		if (event.new) {
			alarms = get(event, 'alarms');
			trigger = get(alarms, '0.trigger.relative');
			neverSent = true;
		} else {
			alarms = get(comp, 'alarms');
			trigger = get(alarms, '0.trigger.0.relative.0');
		}
		let start, end, baseEndTime;
		const utcRecurrenceId = event.utcRecurrenceId;

		//set up start & end time, rounding up to the minute if more than 30 seconds on the event
		if (!isEmpty(comp) && !utcRecurrenceId) {
			start = moment(get(comp, 'start.0.date')).toDate();
			baseEndTime = moment(get(comp, 'end.0.date')).toDate();
			end = comp.allDay ? baseEndTime : this.roundToNearestMinute(baseEndTime);
		} else {
			start = event.start;
			baseEndTime = event.end;
			end = event.allDay ? baseEndTime : this.roundToNearestMinute(baseEndTime);
		}

		const selectedCalendar = this.selectedCalendar(calendars, event);

		if (event.new) {
			if (selectedCalendar.owner) {
				event.folderId = `${selectedCalendar.ownerZimbraId}:${selectedCalendar.sharedItemId}`;
			} else {
				event.folderId = selectedCalendar.id;
			}
		}

		const showInEventNotification = this.shouldShowInviteModalOrNotification(
			isDraft,
			neverSent,
			attendees
		);

		this.setState({
			event: {
				...event,
				name: event.name || get(comp, 'name'),
				start,
				end,
				componentNum: get(comp, 'componentNum'),
				status: get(comp, 'status'),
				transparency: get(comp, 'tranp'),
				recurrence: get(comp, 'recurrence.0')
			},
			...(trigger && { remindValue: remindValueFor(trigger) }),
			...(alarms && {
				remindDesktop: hasDisplayAlarm(alarms),
				remindEmail: hasEmailAlarm(alarms)
			}),
			...(event.class && { isPrivate: event.class === 'PRI' }),
			...(event.freeBusyActual && { showAsValue: event.freeBusyActual }),
			attachments: get(message, 'attachments') || get(event, 'attachments') || [],
			attendees: attendees.map(att => omit(att, '__typename')),
			repeatValue: get(comp, 'recurrence.0.add.0.rule.0.frequency') || 'NONE',
			endsOnDate: get(comp, 'recurrence.0.add.0.rule.0.until.0.date'),
			endsAfterRecur: get(comp, 'recurrence.0.add.0.rule.0.count.0.number'),
			customByMonthDayRule: get(comp, 'recurrence.0.add.0.rule.0.bymonthday.0'),
			customByDayRule: get(comp, 'recurrence.0.add.0.rule.0.byday.0'),
			customByMonthRule: get(comp, 'recurrence.0.add.0.rule.0.bymonth.0'),
			customBySetPosRule: get(comp, 'recurrence.0.add.0.rule.0.bysetpos.0'),
			customIntervalRule: get(comp, 'recurrence.0.add.0.rule.0.interval.0.intervalCount'),
			isCustomRecurringEvent: get(comp, 'recurrence.0.add.0.rule.0'),
			notes: get(comp, 'description.0._content') || get(event, 'excerpt') || '',
			selectedCalendar,
			ownerEmail: selectedCalendar.owner,
			isPrivate: event.class === 'PRI',
			...(extractedLocations && {
				locations: extractedLocations
			}),
			isDraft,
			neverSent,
			showInEventNotification
		});
	};

	alarmsFromState = () => {
		const { remindValue, remindDesktop, remindEmail } = this.state;
		const email =
			get(this, 'props.preferencesData.preferences.zimbraPrefCalendarReminderEmail') ||
			getPrimaryAccountAddress(this.props.accountInfoData.accountInfo);
		if (remindValue === 'never') {
			return [];
		}

		const [, intervalValue, intervalType] = remindValue.match(/(\d*)([mhdws])/);
		const interval = {
			[INTERVAL_SHORTHAND_MAP[intervalType]]: parseInt(intervalValue, 10)
		};

		const alarms = [];
		if (remindDesktop) {
			alarms.push(newAlarm({ interval, action: 'DISPLAY' }));
		}
		if (remindEmail && email) {
			alarms.push(newAlarm({ interval, action: 'EMAIL', attendees: { email } }));
		}

		return alarms;
	};

	recurrenceFromState = () => {
		const {
			repeatValue,
			endsOnDate,
			endsAfterRecur,
			customByDayRule,
			customByMonthRule,
			customByMonthDayRule,
			customBySetPosRule,
			customIntervalRule
		} = this.state;
		if (repeatValue === 'NONE') {
			return undefined;
		}
		const byDay = get(customByDayRule, 'wkday');
		const byMonthDay = get(customByMonthDayRule, 'dayList');
		const byMonth = get(customByMonthRule, 'monthList');
		const bySetPos = get(customBySetPosRule, 'poslist');

		return {
			add: {
				rule: {
					interval: {
						intervalCount: customIntervalRule || 1
					},
					frequency: repeatValue,
					...(endsOnDate && {
						until: {
							date: endsOnDate
						}
					}),
					...(endsAfterRecur && {
						count: {
							number: endsAfterRecur
						}
					}),
					byday: byDay && { wkday: byDay },
					bymonthday: byMonthDay && { dayList: byMonthDay },
					bymonth: byMonth && { monthList: byMonth },
					bysetpos: bySetPos && { poslist: bySetPos }
				}
			}
		};
	};

	splitFolderId = folderId => {
		const ids = folderId.split(':');
		return ids[1] ? ids[1] : ids[0];
	};

	extractLocationPayload = (locations, attendees) => {
		if (!(locations && locations.length)) return;
		if (Array.isArray(locations)) return locations;

		const locationGroup = locations.split(';');
		let customLocationStr = '';
		const extractedLocations = attendees.filter(
			attendee => get(attendee, 'calendarUserType') === CALENDAR_USER_TYPE.resource
		);

		// Custom locations entered by user should be classified into
		// 1. Tokens for syntactically valid email address
		// 2. Plain strings (strings containing semi-colon should be handled specially)
		locationGroup.forEach(location => {
			const trimmedLoc = location.trim();
			const parsedLocation = parseAddress(trimmedLoc);
			if (!extractedLocations.find(loc => loc.address === parsedLocation.address)) {
				if (isValidEmail(trimmedLoc)) {
					extractedLocations.push(parsedLocation);
				} else {
					customLocationStr = customLocationStr
						? customLocationStr.concat(';').concat(location)
						: customLocationStr.concat(location);
				}
			}
		});
		customLocationStr && extractedLocations.push(customLocationStr.trim());
		return extractedLocations;
	};

	validateLocationToken = (address, token) => address || token;

	handleEventNameChange = event => {
		this.setState({
			event: {
				...this.state.event,
				name: event.target.value
			},
			isFormDirty: true
		});
	};

	handleAllDayChange = event => {
		this.setState({
			event: {
				...this.state.event,
				allDay: event.target.checked
			},
			isFormDirty: true
		});
	};

	handleIsPrivateChange = event => {
		this.setState({
			isPrivate: event.target.checked,
			isFormDirty: true
		});
	};

	handleNotesChange = event => {
		this.setState({
			notes: event.target.value,
			isFormDirty: true
		});
	};

	handleRemindValueChange = event => {
		this.setState({
			remindValue: event.target.value,
			isFormDirty: true
		});
	};

	handleRemindDesktopChange = event => {
		this.setState({
			remindDesktop: event.target.checked,
			isFormDirty: true
		});
	};

	handleRemindEmailChange = event => {
		this.setState({
			remindEmail: event.target.checked,
			isFormDirty: true
		});
	};

	handleShowAsValue = event => {
		this.setState({
			showAsValue: event.target.value,
			isFormDirty: true
		});
	};

	hasValidAttendee = attendees =>
		!!attendees.find(
			att => !isString(att) && att.address && att.calendarUserType !== CALENDAR_USER_TYPE.resource
		);

	// show invite modal or in-event notification only if at least 1 valid attendee is present. Attendee is valid if
	// 1. selected from auto-complete
	// 2. Any valid email address
	// 3. locations(location resource too) are excluded from condition
	shouldShowInviteModalOrNotification = (isDraft, neverSent, attendees) =>
		(isDraft || neverSent) && this.hasValidAttendee(attendees);

	handleSendInvite = () => {
		const { attendees = [], isDraft, neverSent } = this.state;
		if (neverSent && !this.hasValidAttendee(attendees)) {
			this.setState({ isDraft: true });
			this.handleSubmit();
			return;
		}
		const showSendInviteModal = this.shouldShowInviteModalOrNotification(
			isDraft,
			neverSent,
			attendees
		);
		showSendInviteModal ? this.setState({ showSendInviteModal }) : this.handleSubmit();
	};

	handleInviteResponse = shouldSendInvite => {
		this.setState({
			showSendInviteModal: false,
			...(shouldSendInvite !== null && {
				isDraft: !shouldSendInvite
			}),
			...(!shouldSendInvite && {
				neverSent: true
			})
		});
		shouldSendInvite !== null && this.handleSubmit();
	};

	handleOnBeforeUnload = handleAfterUnload => {
		const { isFormDirty, pausedBeforeUnload } = this.state;
		if (isFormDirty && !pausedBeforeUnload) {
			this.setState({
				showDiscardChangeModal: true,
				pausedBeforeUnload: true
			});
			this.handleAfterUnload = handleAfterUnload;
			return;
		}
		handleAfterUnload(false);
	};

	handleSubmit = () => {
		let {
			showAsValue,
			event,
			attendees = [],
			notes,
			isPrivate,
			attachments,
			ownerEmail,
			selectedCalendar,
			locations,
			isDraft,
			neverSent,
			isFormDirty,
			allInviteesRemoved
		} = this.state;

		const { editInstance, event: prevEditEvent, primaryAddress, calendars } = this.props;
		let accountName = '';
		let folderIdShared = '';
		let destinationCalId;
		const prevEventFolderId = prevEditEvent.calendarId;
		const prevSelCal = calendars.find(
			cal => cal.id === prevEventFolderId || cal.sharedItemId === prevEventFolderId
		);

		// event.recurrence is reuired to show custom selection but needs to be deleted while editing a single instance of a recurring event.
		editInstance && delete event.recurrence;
		if ((prevSelCal && prevSelCal.owner) || selectedCalendar.owner) {
			if (!event.new) {
				folderIdShared = prevSelCal.sharedItemId || prevSelCal.id;
				// in case calendar of event is changed through edit event form, event should be moved to changed cal.
				destinationCalId = prevSelCal.id !== selectedCalendar.id && selectedCalendar.id;
				accountName = prevSelCal.owner;
			} else {
				accountName = selectedCalendar.owner;
			}
			ownerEmail = selectedCalendar.owner || primaryAddress;
		} else {
			ownerEmail = primaryAddress;
			accountName = '';
		}

		const promiseArray = this.getAttachPromises(attachments);
		const {
			account: {
				attrs: { displayName }
			}
		} = this.props;
		Promise.all(promiseArray)
			.then(res => {
				const aidArr = res;
				this.props.onAction(
					{
						...event,
						locations,
						attendees: attendees.map(att => omit(att, ['__typename', 'id', 'attributes'])),
						isPrivate,
						newAttachments: aidArr,
						attachments: attachments.filter(att => att.url),
						notes,
						alarms: this.alarmsFromState(),
						folderId: this.splitFolderId(event.folderId),
						ownerEmail,
						displayName,
						// When creating exception don't set recurrence info
						...(!editInstance && { recurrence: this.recurrenceFromState() }),
						freeBusy: showAsValue,
						editInstance,
						isDraft,
						neverSent
					},
					folderIdShared,
					accountName,
					destinationCalId,
					isFormDirty,
					allInviteesRemoved
				);
			})
			.catch(error => {
				console.error(error);
				this.props.notify({
					message: (
						<Text
							id={`calendar.editModal.notifications.${
								event.new ? 'problemInCreating' : 'problemInModifying'
							}`}
						/>
					),
					failure: true
				});
			});
	};

	handleAttendeesPickerChange = attendees => {
		this.props.isForwardInvite
			? this.handleForwardAttendeesChange({
					value: attendees.map(addressFromContact)
			  })
			: this.handleAttendeesChange({
					value: attendees.map(addressFromContact)
			  });
	};

	attendeesChange = event =>
		event.value.map(participant => {
			if (isString(participant)) {
				return participant;
			}

			// Find address in state if already stored
			const attendee = this.state.attendees.find(({ address }) => participant.address === address);

			// Delete not required properties
			const { shortName, originalEmail, ...restParticipant } = participant;

			return {
				// Default values
				role: ATTENDEE_ROLE.required,
				participationStatus: PARTICIPATION_STATUS.needsAction,
				rsvp: true,

				// Values stored in state
				...(attendee && {
					role: attendee.role,
					participationStatus: attendee.participationStatus,
					rsvp: attendee.rsvp
				}),

				// Values from address field
				...restParticipant
			};
		});

	handleAttendeesChange = event => {
		const attendees = this.attendeesChange(event);
		// If no valid attendee is present in draft mode, then hide inevent notification
		const { isDraft, attendees: oldAttendees } = this.state;
		const hasValidAttendeeInCurrentlist = this.hasValidAttendee(attendees);
		const hadValidAttendeeInOldlist = this.hasValidAttendee(oldAttendees);
		const showInEventNotification = isDraft && hasValidAttendeeInCurrentlist;
		const update = {
			attendees,
			isFormDirty: true,
			...(!showInEventNotification && { showInEventNotification }),
			// allInviteesRemoved is true when user removes the last valid attendee.
			...(hadValidAttendeeInOldlist &&
				!hasValidAttendeeInCurrentlist && { allInviteesRemoved: true })
		};
		const { availabilityVisible, locations } = this.state;
		if (availabilityVisible) {
			const schedulerCandidates = attendees.concat(
				locations.filter(
					loc => loc.calendarUserType === CALENDAR_USER_TYPE.resource || loc.originalEmail
				)
			);
			!schedulerCandidates.some(a => !isString(a)) && (update.availabilityVisible = false);
		}

		this.setState(update);
	};

	handleForwardAttendeesChange = event => {
		const forwardAttendees = this.filterDuplicateAddresses(this.attendeesChange(event));

		const update = { forwardAttendees };

		this.setState(update);
	};

	handleLocationChange = ({ value }) => {
		const locations = value.map(locationResource => {
			if (isString(locationResource)) {
				return locationResource;
			}

			const location = this.state.locations.find(
				({ address }) => locationResource.address === address
			);
			if (
				locationResource.zimbraCalResType ||
				locationResource.originalEmail ||
				locationResource.calendarUserType === CALENDAR_USER_TYPE.resource
			) {
				const { shortName, originalEmail, ...restLocation } = locationResource;

				return {
					// Default values
					role: ATTENDEE_ROLE.required,
					participationStatus: PARTICIPATION_STATUS.needsAction,
					rsvp: true,
					calendarUserType: CALENDAR_USER_TYPE.resource,

					// Values stored in state
					...(location && {
						role: location.role,
						participationStatus: location.participationStatus,
						rsvp: location.rsvp
					}),

					// Values from address field
					...restLocation
				};
			}

			return location || locationResource;
		});

		// Separate location resources and user text input and order them such that all user text inputs come at the end.
		const resources = [],
			userInputs = [];
		locations.forEach(loc => {
			if (!isString(loc) && (loc.zimbraCalResType || loc.calendarUserType)) {
				resources.push(deepClone(loc));
			} else {
				userInputs.push(deepClone(loc));
			}
		});

		const update = { locations: resources.concat(userInputs), isFormDirty: true };
		const { availabilityVisible, attendees } = this.state;

		if (availabilityVisible) {
			const schedulerCandidates = attendees.concat(
				resources.filter(
					loc => loc.calendarUserType === CALENDAR_USER_TYPE.resource || loc.originalEmail
				)
			);
			!schedulerCandidates.some(a => !isString(a)) && (update.availabilityVisible = false);
		}
		this.setState(update);
	};

	handleToggleAvailabilty = () => {
		this.setState({
			availabilityVisible: !this.state.availabilityVisible
		});
	};

	handleStartChange = date => {
		const { event } = this.state;
		const diff = moment(event.start).diff(date);
		this.setState({
			event: {
				...event,
				start: date,
				end: moment(event.end)
					.subtract(diff)
					.toDate()
					.setSeconds(0)
			},
			isFormDirty: true
		});
	};

	handleEndChange = date => {
		this.setState({
			event: {
				...this.state.event,
				end: date
			},
			isFormDirty: true
		});
	};

	chooseAttachments = () => {
		this.setState({ isChoosingAttachments: true });
		chooseFiles(this.addAttachments);
	};

	addAttachments = attachments => {
		const isOffline = this.props.isOffline;
		if (isOffline) return;
		let [previewAttachments, otherAttachments] = partition(attachments, hasAttachmentPreview);
		previewAttachments = previewAttachments.map(encodeAttachment);
		Promise.all(previewAttachments).then(res => {
			this.setState({
				...this.state,
				isChoosingAttachments: false,
				isErrored: false,
				attachments: [...this.state.attachments, ...res, ...otherAttachments],
				isFormDirty: true
			});
		});
	};

	getAttachPromises = attachments =>
		attachments &&
		attachments
			.filter(attachment => !attachment.url) // Ignore existing attachments
			.map(attachment =>
				this.props.attach(attachment, {
					filename: attachment.name,
					contentType: attachment.type
				})
			);

	onDiscardChangeAction = () => {
		const { onClose, isForwardInvite, prevLocation } = this.props;
		const { pausedBeforeUnload } = this.state;
		if (pausedBeforeUnload) {
			this.handleAfterUnload && this.handleAfterUnload(false);
			return;
		}
		onClose();
		isForwardInvite && route(prevLocation || '/');
	};

	onClose = () => {
		if (!this.state.isChoosingAttachments) {
			this.props.onClose();
		}
	};

	onDiscardModalClose = () => {
		this.handleAfterUnload && this.handleAfterUnload(true); //To prevent routing when close/cancel button is clicked
		this.handleAfterUnload = null;
		this.setState({
			showDiscardChangeModal: false,
			pausedBeforeUnload: false //To make Dialog box available after user clicks close/cancel button
		});
	};

	onHandleUnsavedChanges = () => {
		const { isFormDirty } = this.state;
		const { prevLocation, isForwardInvite } = this.props;
		if (isFormDirty) {
			this.setState({
				showDiscardChangeModal: true
			});
			return;
		}
		this.onClose();
		isForwardInvite && route(prevLocation || '/');
	};

	removeAttachment = ({ attachment }) => {
		const { attachments } = this.state;
		this.setState({
			...this.state,
			isErrored: false,
			attachments: attachments.filter(a =>
				attachment.part ? a.part !== attachment.part : a !== attachment
			),
			isFormDirty: true
		});
	};

	isPrivateCheck = calendar => !calendar.permissions || calendar.permissions.includes('p');

	handleCalendarChange = ({ value }) => {
		const { event } = this.state;
		const { calendars } = this.props;
		const ownerEmail = null;
		const isPrivateAllowed = this.isPrivateCheck(value);

		if (value.owner) {
			event.folderId = `${value.ownerZimbraId}:${value.sharedItemId}`;
		} else {
			event.folderId = value.id;
		}

		this.setState({
			event,
			ownerEmail,
			isPrivate: isPrivateAllowed && this.state.isPrivate,
			selectedCalendar: this.selectedCalendar(calendars, event),
			isFormDirty: true
		});
	};

	selectedCalendar = (calendars, event) => {
		let ciFolder = get(this.props.appointmentData, 'message.invitations.0.components.0.ciFolder');
		ciFolder =
			ciFolder === USER_FOLDER_IDS.TRASH.toString()
				? CALENDAR_IDS[CALENDAR_TYPE.own].DEFAULT
				: ciFolder;
		const folderId = event.folderId || ciFolder;
		const indexOfColon = folderId.indexOf(':');

		return calendars.find(cal => {
			if (indexOfColon > -1) {
				return `${cal.ownerZimbraId}:${cal.sharedItemId}` === folderId;
			}
			return cal.id === folderId;
		});
	};

	filterDuplicateAddresses = arr => {
		let hasDupes = false;
		const found = [],
			out = [];
		const { isLocation } = this.props;

		for (let i = 0; i < arr.length; i++) {
			const addr = arr[i];
			const stringToCheck = isLocation && isString(addr) ? addr : addr.address;

			if (found.indexOf(stringToCheck) === -1) {
				found.push(stringToCheck);
				out.push(addr);
			} else {
				hasDupes = true;
			}
		}

		return hasDupes ? out : arr;
	};

	static defaultProps = {
		title: 'calendar.editModal.title',
		editTitle: 'calendar.editModal.editTitle',
		forwardTitle: 'calendar.editModal.forwardTitle'
	};

	updateRepeatVal = repeatValue =>
		this.setState({
			repeatValue,
			isCustomRecurringEvent: false,
			customByMonthDayRule: null,
			customByDayRule: null,
			customByMonthRule: null,
			customBySetPosRule: null,
			customIntervalRule: null,
			endsOnDate: null,
			endsAfterRecur: null,
			isFormDirty: true
		});

	handleCustomRecurrenceChange = ({
		endsOnDate,
		endsAfterRecur,
		customByDayRule,
		customByMonthRule,
		customByMonthDayRule,
		customBySetPosRule,
		selectedOption,
		intervalCount
	}) => {
		this.setState(
			{
				endsOnDate,
				endsAfterRecur,
				repeatValue: selectedOption,
				customByDayRule,
				customByMonthRule,
				customByMonthDayRule,
				customBySetPosRule,
				customIntervalRule: intervalCount,
				isCustomRecurringEvent: true,
				customSettingChanged: true,
				isFormDirty: true
			},
			() => {
				this.setState({
					event: {
						...this.state.event,
						recurrence: this.recurrenceFromState()
					}
				});
			}
		);
	};

	handleForwardAppointment = () => {
		const { event, forwardAppointmentInvite, prevLocation } = this.props;
		const message = this.forwardAppointmentMessage();
		const appointmentInvite = {
			id: event.inviteId,
			message
		};
		forwardAppointmentInvite(appointmentInvite)
			.then(() => {
				this.props.notify({
					message: <Text id="calendar.editModal.forward" />
				});
			})
			.catch(err => {
				console.error(err);
				this.props.notify({
					message: get(err, 'message'),
					failure: true
				});
			});

		route(prevLocation || '/');
	};

	forwardAppointmentMessage = () => {
		const appointment = get(this.props.appointmentData, 'message.invitations.0.components.0');
		const { forwardAttendees, notes, event, locations = [] } = this.state;
		const { organizer } = appointment;
		const { start, end, name } = event;

		const attendeesVal = forwardAttendees.filter(
			token => !isString(token) && isValidEmail(getEmail(token.address))
		);

		const emailAddresses = [];

		attendeesVal.map(value =>
			emailAddresses.push({
				address: value.address,
				type: 't'
			})
		);

		const description = {
			mimeParts: {
				contentType: 'multipart/alternative',
				mimeParts: appointmentBody({
					organizer,
					start,
					end,
					location: createLocationPayload(locations),
					attendees: attendeesVal,
					subject: name,
					body: notes,
					template: this.props.inviteTemplate
				})
			}
		};
		return {
			subject: name,
			emailAddresses,
			...description
		};
	};

	componentWillMount() {
		this.setEvent(this.props);
	}

	componentWillReceiveProps(nextProps) {
		const nextAppointmentId = get(nextProps, 'appointmentData.message.id');
		if (
			get(nextProps, 'event.inviteId') !== get(this.props, 'event.inviteId') ||
			(nextAppointmentId && nextAppointmentId !== get(this.props, 'appointmentData.message.id'))
		) {
			this.setEvent(nextProps);
		}
	}

	render(
		{
			title,
			isOffline,
			editTitle,
			inline,
			class: cls,
			matchesScreenMd,
			matchesScreenXs,
			editInstance,
			calendars,
			formClass,
			disableMobileToolbar = false,
			footerClass,
			hideAttachmentPreview = false,
			showContactPicker,
			onOpenContactPicker,
			onCloseContactPicker,
			showCustomRecurrenceModal,
			onOpenCustomRecurrenceModal,
			onCloseCustomRecurrenceModal,
			isForwardInvite,
			appointmentData,
			forwardTitle,
			createEvent
		},
		{
			isPrivate,
			attendees,
			forwardAttendees,
			event,
			notes,
			remindDesktop,
			remindEmail,
			remindValue,
			repeatValue,
			showAsValue,
			availabilityVisible,
			attachments,
			selectedCalendar,
			locations,
			endsOnDate,
			endsAfterRecur,
			customByDayRule,
			customByMonthRule,
			customByMonthDayRule,
			customBySetPosRule,
			customIntervalRule,
			isCustomRecurringEvent,
			showSendInviteModal,
			showDiscardChangeModal,
			showInEventNotification,
			customSettingChanged
		}
	) {
		const start = moment(event.start);
		const { allDay } = event;

		const invalidDateRange = start.diff(event.end) > 0;

		const nonResourceAttendees = attendees.filter(
			attendee => attendee.calendarUserType !== CALENDAR_USER_TYPE.resource
		);

		const nonResourceForwardAttendees = forwardAttendees.filter(
			attendee => attendee.calendarUserType !== CALENDAR_USER_TYPE.resource
		);

		const selectedAttendee = isForwardInvite ? nonResourceForwardAttendees : nonResourceAttendees;

		const allAttendees = nonResourceAttendees.concat(nonResourceForwardAttendees);

		const schedulerCandidates = allAttendees.concat(
			locations.filter(
				loc =>
					loc.zimbraCalResType === 'Location' ||
					loc.calendarUserType === CALENDAR_USER_TYPE.resource
			)
		);

		const showAvailabilityButtonVisible =
			!availabilityVisible && schedulerCandidates.some(a => !isString(a));

		const saveButtonVisible =
			event.name &&
			((!isForwardInvite && !selectedAttendee.length) ||
				(selectedAttendee.length &&
					this.hasValidAttendee(isForwardInvite ? forwardAttendees : attendees)));

		const organizerAddress = get(appointmentData, 'message.invitations.0.components.0.organizer');

		const organizerName = organizerAddress && displayAddress(organizerAddress);

		const dialogTitle = isForwardInvite ? forwardTitle : event.new ? title : editTitle;

		const isPrivateAllowed = this.isPrivateCheck(selectedCalendar);

		const disabledElement = isForwardInvite && s.disabledElement;

		let desktopHeading, mobileHeading;
		if (matchesScreenMd) {
			// desktop view
			desktopHeading = (
				<DesktopHeading
					title={dialogTitle}
					field={organizerName}
					onClose={this.onHandleUnsavedChanges}
				/>
			);
		} else {
			mobileHeading = <MobileHeading title={dialogTitle} field={organizerName} />;
		}

		return (
			<div className={cx(cls, s.wrapper, inline && s.inlineWrapper)}>
				{showContactPicker && (
					<ContactPicker
						// @FIXME temporary fix, contactpicker component should filter out selected contacts from full contact list, which is not happening correctly
						contacts={this.filterDuplicateAddresses(
							isForwardInvite ? nonResourceForwardAttendees : nonResourceAttendees
						)}
						onSave={this.handleAttendeesPickerChange}
						onClose={onCloseContactPicker}
					/>
				)}
				{showCustomRecurrenceModal && (
					<CustomRecurrenceModal
						event={event}
						eventEndsOnDate={endsOnDate}
						eventEndsAfterRecur={endsAfterRecur}
						customEventByMonthRule={customByMonthRule}
						customEventByDayRule={customByDayRule}
						customEventByMonthDayRule={customByMonthDayRule}
						customEventBySetPosRule={customBySetPosRule}
						customRepeatValue={repeatValue}
						customEventIntervalRule={customIntervalRule}
						onSave={this.handleCustomRecurrenceChange}
						onClose={onCloseCustomRecurrenceModal}
					/>
				)}
				{desktopHeading}
				<CaptureBeforeUnload onBeforeUnload={this.handleOnBeforeUnload}>
					<AlignedForm class={cx(s.formWrapper, formClass)}>
						{mobileHeading}
						{showInEventNotification && (
							<InEventNotification
								notificationText="calendar.editModal.notifications.inEventNotificationText"
								linkText="calendar.editModal.notifications.inEventNotificationAction"
								onLinkClick={this.handleInviteResponse}
							/>
						)}
						<FormGroup>
							<TextInput
								placeholderId={title}
								value={event.name}
								onInput={this.handleEventNameChange}
								wide
								autofocus
							/>
						</FormGroup>
						{isForwardInvite && (
							<FormGroup>
								<AlignedLabel class={s.alignedLabel} align="left">
									<Localizer>
										<a
											href="javascript:"
											aria-label={<Text id="contacts.picker.title" />}
											onClick={onOpenContactPicker}
										>
											<Text id="calendar.editModal.fields.to" />
										</a>
									</Localizer>
								</AlignedLabel>
								<AddressField
									class={s.addressField}
									value={nonResourceForwardAttendees}
									onChange={this.handleForwardAttendeesChange}
									formSize
								/>
							</FormGroup>
						)}
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.start"
							/>
							<div class={s.datepickerWrapper}>
								<DateInput
									class={s.dateSelector}
									dateValue={event.start}
									onDateChange={this.handleStartChange}
									disabled={isForwardInvite}
								/>
								<TimeInput
									class={s.timeSelector}
									dateValue={allDay ? start.startOf('day') : event.start}
									onDateChange={this.handleStartChange}
									disabled={allDay || isForwardInvite}
								/>
								<label class={cx(s.allDay, disabledElement)}>
									<ChoiceInput
										checked={allDay}
										onChange={this.handleAllDayChange}
										disabled={isForwardInvite}
									/>
									<Text id="calendar.editModal.fields.allDay" />
								</label>
							</div>
						</FormGroup>
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.end"
							/>
							<div class={s.datepickerWrapper}>
								<DateInput
									class={s.dateSelector}
									dateValue={event.end}
									onDateChange={this.handleEndChange}
									invalid={invalidDateRange}
									disabled={isForwardInvite}
								/>
								<TimeInput
									class={s.timeSelector}
									dateValue={allDay ? moment(event.end).endOf('day') : event.end}
									onDateChange={this.handleEndChange}
									disabled={allDay || isForwardInvite}
									invalid={invalidDateRange}
								/>
							</div>
						</FormGroup>
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.repeat"
							/>
							<ActionMenu
								label={
									showCustomRecurrenceModal || isCustomRecurringEvent ? (
										<Recurrence
											recurrence={event.recurrence}
											startTime={event.start}
											newEvent={createEvent || customSettingChanged}
										/>
									) : (
										<Text id={`calendar.editModal.fields.repeatOptions.${repeatValue}`} />
									)
								}
								actionButtonClass={cx(s.repeatInstanceBtn, disabledElement)}
								disabled={editInstance || isForwardInvite}
							>
								<DropDownWrapper>
									<ActionMenuGroup>
										{REPEAT_OPTIONS.map(val => (
											<ActionMenuItem onClick={callWith(this.updateRepeatVal, val)}>
												<Text id={`calendar.editModal.fields.repeatOptions.${val}`} />
											</ActionMenuItem>
										))}
										{isCustomRecurringEvent && (
											<ActionMenuItem class={s.customRecurrText}>
												<Recurrence
													recurrence={event.recurrence}
													startTime={event.start}
													newEvent={createEvent || customSettingChanged}
												/>
											</ActionMenuItem>
										)}
									</ActionMenuGroup>
									<ActionMenuGroup>
										<ActionMenuItem onClick={onOpenCustomRecurrenceModal}>
											<Text id="buttons.custom" />
										</ActionMenuItem>
									</ActionMenuGroup>
								</DropDownWrapper>
							</ActionMenu>
							<AlignedLabel class={s.privateWrapper} align="left">
								<label class={disabledElement}>
									<ChoiceInput
										disabled={!isPrivateAllowed || isForwardInvite}
										checked={isPrivateAllowed && isPrivate}
										onChange={this.handleIsPrivateChange}
									/>
									<Text id="calendar.editModal.fields.private" />
								</label>
							</AlignedLabel>
						</FormGroup>
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.location"
							/>
							<AddressField
								class={cx(s.addressField, disabledElement)}
								value={locations}
								onChange={this.handleLocationChange}
								validateToken={this.validateLocationToken}
								type="resource"
								isLocation
								formSize
								disabled={isForwardInvite}
							/>
						</FormGroup>
						<FormGroup class={s.inviteesGroup}>
							<AlignedLabel class={cx(s.alignedLabel, disabledElement)} align="left">
								<Localizer>
									<a
										href="javascript:"
										aria-label={<Text id="contacts.picker.title" />}
										onClick={!isForwardInvite && onOpenContactPicker}
									>
										<Text id="calendar.editModal.fields.invitees" />
									</a>
								</Localizer>
							</AlignedLabel>
							<AddressField
								class={cx(s.addressField, disabledElement)}
								value={nonResourceAttendees}
								onChange={this.handleAttendeesChange}
								formSize
								disabled={isForwardInvite}
							/>
						</FormGroup>
						<FormGroup
							class={
								(availabilityVisible || showAvailabilityButtonVisible) &&
								s.availabilityIndicatorGroup
							}
						>
							{!matchesScreenXs &&
								(availabilityVisible ? (
									<AvailabilityIndicator
										event={event}
										attendees={schedulerCandidates}
										onAttendeesChange={
											isForwardInvite
												? this.handleForwardAttendeesChange
												: this.handleAttendeesChange
										}
										onLocationsChange={this.handleLocationChange}
										onStartChange={this.handleStartChange}
										onClose={this.handleToggleAvailabilty}
										isForwardInvite={isForwardInvite}
										prevAttendees={attendees}
										forwardAttendees={forwardAttendees}
									/>
								) : (
									showAvailabilityButtonVisible && (
										<Button
											class={cx(s.fieldOffset, s.availabilityButton)}
											onClick={this.handleToggleAvailabilty}
										>
											<Text id="calendar.editModal.buttons.showAvailability" />
										</Button>
									)
								))}
						</FormGroup>
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.notes"
							/>
							<div class={s.notesContainer}>
								<Textarea
									class={s.textArea}
									rows="5"
									wide
									value={notes}
									onInput={this.handleNotesChange}
								/>
								{attachments &&
									(attachments.length > 0 && (
										<div class={s.attachments}>
											<AttachmentGrid
												attachments={attachments}
												hideAttachmentHeader
												hideAttachmentPreview={hideAttachmentPreview}
												removable
												onRemove={this.removeAttachment}
											/>
										</div>
									))}
							</div>
							<Button
								title={<Text id="calendar.editModal.buttons.addAttachment" />}
								class={cx(s.attachmentButton, isOffline && s.disabled)}
								onClick={this.chooseAttachments}
								disabled={isOffline || isForwardInvite}
							>
								<Icon size="md" name="paperclip" />
							</Button>
						</FormGroup>
						<FormGroup compact>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.remind"
							/>
							<SelectOption
								value={remindValue}
								onChange={this.handleRemindValueChange}
								disabled={isForwardInvite}
								class={disabledElement}
							>
								{REMIND_OPTIONS.map(k => (
									<option value={k} key={k}>
										<Text id={`calendar.editModal.fields.remindOptions.${k}`} />
									</option>
								))}
							</SelectOption>
						</FormGroup>
						{remindValue !== 'never' && (
							<FormGroup class={s.fieldOffset} rows>
								<label class={cx(s.subOption, disabledElement)}>
									<ChoiceInput
										onChange={this.handleRemindDesktopChange}
										checked={remindDesktop}
										disabled={isForwardInvite}
									/>
									<Text id="calendar.editModal.fields.mobileDesktop" />
								</label>
								<label class={cx(s.subOption, disabledElement)}>
									<ChoiceInput
										onChange={this.handleRemindEmailChange}
										checked={remindEmail}
										disabled={isForwardInvite}
									/>
									<Text id="calendar.editModal.fields.email" />
								</label>
							</FormGroup>
						)}
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.showAs"
							/>
							<SelectOption
								value={showAsValue}
								onChange={this.handleShowAsValue}
								disabled={isForwardInvite}
								class={disabledElement}
							>
								{SHOW_AS_OPTIONS.map(k => (
									<option value={k} key={k}>
										<Text id={`calendar.editModal.fields.showAsOptions.${k}`} />
									</option>
								))}
							</SelectOption>
						</FormGroup>
						<FormGroup>
							<AlignedLabel
								class={s.alignedLabel}
								align="left"
								textId="calendar.editModal.fields.calendar"
							/>
							<Select
								displayValue={<CalendarOptionItem calendar={selectedCalendar} style={s} />}
								iconPosition="right"
								iconSize="sm"
								onChange={this.handleCalendarChange}
								class={cx(s.calendarSelect, disabledElement)}
								dropup
								toggleButtonClass={cx(s.toggleButtonClass.disabledElement)}
								disabled={isForwardInvite}
							>
								{filterNonInsertableCalendars(calendars).map(cal => (
									<Option icon={null} value={cal} key={cal.id} class={s.calendarOption}>
										<CalendarOptionItem calendar={cal} style={s} />
									</Option>
								))}
							</Select>
						</FormGroup>
					</AlignedForm>
				</CaptureBeforeUnload>
				<AppointmentEditToolbar
					isMobileActive={!disableMobileToolbar && !matchesScreenMd}
					onSave={
						saveButtonVisible &&
						(isForwardInvite ? this.handleForwardAppointment : this.handleSendInvite)
					}
					onCancel={this.onHandleUnsavedChanges}
					footerClass={footerClass}
					isForwardInvite={isForwardInvite}
				/>
				{showSendInviteModal && (
					<ConfirmModalDialog
						title={<Text id="calendar.dialogs.sendInvite.title" />}
						cancelButton={false}
						onResult={this.handleInviteResponse}
						acceptText="buttons.send"
						rejectText="buttons.dontSend"
						contentClass={s.discardModalContent}
					/>
				)}
				{showDiscardChangeModal && (
					<ModalDialog
						title="calendar.dialogs.discardChanges.title"
						actionLabel="calendar.dialogs.discardChanges.buttonText"
						onAction={this.onDiscardChangeAction}
						onClose={this.onDiscardModalClose}
						contentClass={s.discardModalContent}
					/>
				)}
			</div>
		);
	}
}
