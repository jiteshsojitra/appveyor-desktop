import { graphql, compose } from 'react-apollo';
import moment from 'moment';
import get from 'lodash-es/get';
import withAccountInfo from '../../graphql-decorators/account-info';
import { getPrimaryAccountAddress } from '../../utils/account';
import { prepareCalendarList } from '../../utils/calendar';
import AppointmentDeleteMutation from '../../graphql/queries/calendar/appointment-delete.graphql';
import AppointmentCreateMutation from '../../graphql/queries/calendar/appointment-create.graphql';
import AppointmentCreateExceptionMutation from '../../graphql/queries/calendar/appointment-create-exception.graphql';
import AppointmentModifyMutation from '../../graphql/queries/calendar/appointment-modify.graphql';
import AppointmentMoveMutation from '../../graphql/queries/calendar/appointment-move.graphql';
import MessageQuery from '../../graphql/queries/message.graphql';
import CalendarsQuery from '../../graphql/queries/calendar/calendars.graphql';
import htmlInviteEmail from '../../components/calendar/emails/html-invite-email';
import plainTextInviteEmail from '../../components/calendar/emails/plain-text-invite-email';
import getContext from '../../lib/get-context';

import { USER_FOLDER_IDS } from '../../constants';
import { isValidEmail, getEmail, serializeAddress, deepClone } from '../../lib/util';
import isString from 'lodash/isString';
import { CALENDAR_USER_TYPE } from '../../constants/calendars';

function zimbraFormat(date, allDay) {
	return allDay ? moment(date).format('YYYYMMDD') : moment(date).format('YYYYMMDD[T]HHmmss');
}

function inviteEmailMailParts(options) {
	return [
		{
			contentType: 'text/plain',
			content: plainTextInviteEmail(options)
		},
		{
			contentType: 'text/html',
			content: htmlInviteEmail(options)
		}
	];
}

export function appointmentBody(options) {
	const { attendees, body } = options;

	// Meeting requests
	if (attendees.length && body) {
		return inviteEmailMailParts(options);
	}

	return [
		{
			contentType: 'text/plain',
			content: body || ''
		},
		{
			contentType: 'text/html',
			content: body || ''
		}
	];
}

export function createLocationPayload(locations) {
	const payload = [];

	locations.forEach(location => {
		if (isString(location)) payload.push(location);
		else if (!(location.zimbraCalResType || location.calendarUserType)) {
			payload.push(location.address);
		} else {
			payload.push(serializeAddress(location.address, location.name));
		}
	});

	return payload.join('; ').trim();
}

function addResourcesToAttendees(attendees, locations) {
	// In order to find delta of resources in attendees, re-populate all resources.
	let attendeesClone = deepClone(
		attendees.filter(att => !(att.calendarUserType === CALENDAR_USER_TYPE.resource))
	);

	attendeesClone = attendeesClone.concat(
		locations.filter(loc => {
			if (
				loc.zimbraCalResType === 'Location' ||
				loc.calendarUserType === CALENDAR_USER_TYPE.resource
			) {
				delete loc.zimbraCalResType;
				delete loc.__typename;
				return true;
			}
			return false;
		})
	);

	return attendeesClone;
}

function createAppointmentMutationVariables({
	inviteId,
	folderId,
	ownerEmail,
	modifiedSequence,
	revision,
	name,
	locations,
	start,
	end,
	exceptId,
	alarms,
	recurrence,
	freeBusy,
	allDay,
	isPrivate,
	notes,
	attachments = [],
	newAttachments = [],
	attendees = [],
	componentNum,
	organizer = {},
	status,
	folderIdShared,
	accountName,
	primaryAddress,
	displayName,
	intl,
	isDraft
}) {
	let emailAddresses = [];
	organizer = {
		address: organizer.address || ownerEmail || primaryAddress,
		name: displayName,
		sentBy: organizer.address
	};
	emailAddresses.push({
		address: ownerEmail || primaryAddress,
		type: 'f'
	});

	const locationString = createLocationPayload(locations);
	const timezone = moment.tz.guess();
	attendees = addResourcesToAttendees(attendees, locations);

	const attendeesVal = attendees.filter(
		token => !isString(token) && isValidEmail(getEmail(token.address)) // Incomplete address
	); // Invalid email

	if (!isDraft) {
		emailAddresses.push({
			address: ownerEmail || primaryAddress,
			type: 's'
		});

		emailAddresses = emailAddresses.concat(
			attendeesVal.map(attendee => ({
				address: attendee.address,
				type: 't'
			}))
		);
	}

	const startVal = { date: zimbraFormat(start, allDay), timezone };
	const endVal =
		allDay && zimbraFormat(end, allDay) === startVal
			? null
			: { date: zimbraFormat(end, allDay), timezone };
	const classType = isPrivate ? 'PRI' : 'PUB';

	//fields only set when modifying an appointment
	const modifyFields = !inviteId
		? {}
		: {
				id: inviteId,
				modifiedSequence,
				revision
		  };

	const description = {
		mimeParts: {
			contentType: 'multipart/alternative',
			mimeParts: appointmentBody({
				organizer,
				start,
				end,
				location: locationString,
				attendees: attendeesVal,
				subject: name,
				body: notes,
				template: get(intl.dictionary, 'calendar.invite')
			})
		}
	};
	return {
		appointment: {
			...modifyFields,
			componentNum,
			message: {
				folderId: folderIdShared || folderId || String(USER_FOLDER_IDS.CALENDAR),
				subject: name,
				invitations: {
					components: [
						{
							name,
							location: locationString,
							alarms,
							recurrence,
							freeBusy,
							allDay,
							class: classType,
							organizer,
							start: startVal,
							end: endVal,
							status,
							// Pass exceptId only when creating an exception
							...(exceptId && { exceptId: { date: exceptId } }),
							attendees: attendeesVal,
							draft: isDraft
						}
					]
				},
				emailAddresses,
				...description,
				...((attachments.length || newAttachments.length) && {
					attachments: {
						...(newAttachments.length && {
							attachmentId: newAttachments.join(',')
						}),
						...(attachments.length && {
							existingAttachments: attachments.map(att => ({
								messageId: att.messageId,
								part: att.part
							}))
						})
					}
				})
			}
		},
		accountName
	};
}

export function withAppointmentData() {
	return graphql(MessageQuery, {
		name: 'appointmentData',
		skip: props => !get(props, 'event.inviteId'),
		// For delegated events, send entire invite id. For non-delegated invite id, strip message id.
		options: ({ event: { inviteId, utcRecurrenceId, isOrganizer }, isForwardInvite }) => ({
			variables: {
				id:
					inviteId.indexOf(':') === -1 && !isOrganizer && !isForwardInvite
						? inviteId.split('-')[1]
						: inviteId,
				ridZ: utcRecurrenceId
			}
		})
	});
}

export function withDeleteAppointment() {
	return graphql(AppointmentDeleteMutation, {
		props: ({ ownProps: { calendarsData }, mutate }) => ({
			deleteAppointment: ({ inviteId, date, start, message }) =>
				mutate({
					variables: {
						appointment: {
							inviteId,
							...(date && { instanceDate: date }),
							...(start && start),
							...(message && message),
							componentNum: '0'
						}
					}
				}).then(() => {
					calendarsData.refetch();
				})
		})
	});
}

export function withCalendars() {
	return graphql(CalendarsQuery, {
		props: ({ data: { getFolder = [], loading } }) => ({
			...prepareCalendarList(
				get(getFolder, 'folders.0.folders'),
				get(getFolder, 'folders.0.linkedFolders')
			),
			loading
		})
	});
}

export function withMoveAppointment() {
	return graphql(AppointmentMoveMutation, {
		props: ({ mutate }) => ({
			moveAppointment: ({ calendarItemId, destFolderId }) =>
				mutate({
					variables: { id: calendarItemId, folderId: destFolderId }
				})
		})
	});
}

const appointmentMutationFactory = (mutationName, propName, updateMessageQuery) => () =>
	compose(
		withAccountInfo(({ data: { accountInfo } }) => ({
			primaryAddress: accountInfo && getPrimaryAccountAddress(accountInfo)
		})),
		getContext(context => ({ intl: context.intl })),
		graphql(mutationName, {
			props: ({ ownProps: { calendarsData, primaryAddress, intl }, mutate }) => ({
				[propName]: (appointmentInput, folderIdShared, accountName) => {
					const mutationVariables = createAppointmentMutationVariables({
						...appointmentInput,
						folderIdShared,
						accountName,
						primaryAddress,
						intl
					});

					const mutateOptions = {
						variables: mutationVariables,

						// Update MessageQuery data if required
						...(updateMessageQuery && {
							refetchQueries: [
								{
									query: MessageQuery,
									variables: {
										id: appointmentInput.inviteId,
										ridZ: appointmentInput.utcRecurrenceId
									}
								}
							]
						})
					};

					return mutate(mutateOptions).then(resp => {
						calendarsData.refetch();
						return resp;
					});
				}
			})
		})
	);

export const withCreateAppointment = appointmentMutationFactory(
	AppointmentCreateMutation,
	'createAppointment'
);

export const withCreateAppointmentException = appointmentMutationFactory(
	AppointmentCreateExceptionMutation,
	'createAppointmentException'
);

export const withModifyAppointment = appointmentMutationFactory(
	AppointmentModifyMutation,
	'modifyAppointment',
	true
);
