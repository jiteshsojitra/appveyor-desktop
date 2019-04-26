import { h, Component } from 'preact';
import { Icon, Select, Option } from '@zimbra/blocks';
import AddressList from '../address-list';
import cx from 'classnames';
import Recurrence from '../recurrence';
import array from '@zimbra/util/src/array';
import style from './style';
import { types as apiClientTypes } from '@zimbra/api-client';
import withAccountInfo from '../../graphql-decorators/account-info';
import { withCalendars, withMoveAppointment } from '../../graphql-decorators/calendar';
import { connect } from 'preact-redux';
import get from 'lodash/get';
import partition from 'lodash/partition';
import { rearrangePrimaryCalendars, filterNonInsertableCalendars } from '../../utils/calendar';
import { Text, withText } from 'preact-i18n';
import { notify } from '../../store/notifications/actions';
import CalendarOptionItem from '../calendar/appointment-edit/calendar-option-item';
import { withPropsOnChange } from 'recompose';
import linkState from 'linkstate';
import { adjustTimeToLocalTimeZone } from '../../utils/invitation';
import { USER_FOLDER_IDS } from '../../constants';
import { CALENDAR_USER_TYPE, PARTICIPATION_STATUS } from '../../constants/calendars';
import withSendInviteReply from '../../graphql-decorators/calendar/invite-reply';
import InvitationResponse from '../invitation-response';
import { getAccountFromAddressForId } from '../../utils/account';

const { InviteReplyVerb } = apiClientTypes;

@withCalendars()
@withSendInviteReply()
@connect(
	state => ({
		isOffline: get(state, 'network.isOffline')
	}),
	{ notify }
)
@withAccountInfo()
@withText({
	accept: 'buttons.accept',
	tentative: 'buttons.tentative',
	decline: 'buttons.decline',
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatCustomLLLL: `${timeFormats}.longDateFormat.customLLLL`,
		formatLongHourLT: `${timeFormats}.longDateFormat.longHourLT`,
		formatDateLong: 'timeFormats.dateFormats.formatDateLong',
		formatDateMedium: 'timeFormats.dateFormats.formatDateMedium',
		formatMonthLong: 'timeFormats.dateFormats.formatMonthLong'
	};
})
@withPropsOnChange(
	['account.prefs.zimbraPrefDefaultCalendarId', 'calendarSections'],
	({ account, invitation, calendarSections, activeAccountId }) => {
		const ownCalendars = get(calendarSections, 'own'),
			defaultCal = get(account, 'prefs.zimbraPrefDefaultCalendarId'),
			editableCals = ownCalendars && rearrangePrimaryCalendars(ownCalendars);
		return {
			activeAccountAddress: getAccountFromAddressForId(account, activeAccountId),
			defaultCalId: ownCalendars
				? (defaultCal && defaultCal.toString()) || editableCals[0].id
				: USER_FOLDER_IDS.CALENDAR,
			inviteFolderId: get(invitation, 'components.0.ciFolder')
		};
	}
)
@withMoveAppointment()
export default class Invitation extends Component {
	state = {
		calSelectId: null
	};

	handleReplyClick = verb => {
		const inviteFolderId = this.props.inviteFolderId,
			destFolderId = this.state.calSelectId || this.props.defaultCalId;

		this.setState({ inviteReplyInProgress: true });
		this.props
			.sendInviteReply({
				verb,
				message: this.props.message,
				isCalendarView: false
			})
			.then(({ data: { sendInviteReply: { calendarItemId } } }) => {
				this.setState({ inviteReplyInProgress: false });

				this.props.notify({
					message: <Text id="mail.notifications.sent" />
				});
				//move appointment to different calendar, but only if it doesn't match the appointment's original folder
				inviteFolderId !== destFolderId &&
					this.props.moveAppointment({
						destFolderId,
						calendarItemId
					});
			});
	};

	render(
		{
			invitation,
			calendars,
			loading,
			defaultCalId,
			account,
			message,
			activeAccountAddress,
			formatCustomLLLL,
			formatLongHourLT,
			formatDateLong,
			formatDateMedium,
			formatMonthLong
		},
		{ inviteReplyInProgress, calSelectId }
	) {
		const organizerAddress = get(invitation, 'components.0.organizer.address');
		const showRsvpButtons =
			!get(invitation, 'components.0.isOrganizer') && activeAccountAddress !== organizerAddress;
		const component = get(invitation, 'components[0]'),
			replies = get(invitation, 'replies[0].reply', null),
			date =
				component &&
				adjustTimeToLocalTimeZone(
					component,
					formatCustomLLLL,
					formatLongHourLT,
					formatMonthLong,
					formatDateLong,
					formatDateMedium
				); // LLLL format in moment : day, Month date, year hh:mm A

		const selectCalendars = filterNonInsertableCalendars(calendars);
		//zimbra SOAP will return an empty invite object on an older invitation if an event has been modified
		if (!component) {
			return (
				<div class={cx(style.invitation, style.outdated)}>
					<Icon name="warning" /> <Text id="invitations.labels.invitationNotCurrent" />
				</div>
			);
		}

		const isOrganizer = component.isOrganizer || activeAccountAddress === organizerAddress || false;
		const isAppointmentInTrash = parseInt(component.ciFolder, 10) === USER_FOLDER_IDS.TRASH;
		const isCancelledInvitation = get(component, 'status') === 'CANC';

		const participationIds = [
			PARTICIPATION_STATUS.accept,
			PARTICIPATION_STATUS.tentative,
			PARTICIPATION_STATUS.declined
		];
		let attendee = null,
			nonRespondedStatus = null;
		if (showRsvpButtons) {
			attendee = replies
				? replies.find(a => account.name === a.attendee)
				: component.attendees.find(a => account.name === a.address);

			nonRespondedStatus = participationIds.filter(
				participation => attendee && attendee.participationStatus !== participation
			);
		}

		const [invitees, locations] = partition(
			component.attendees || [],
			att => att.calendarUserType !== CALENDAR_USER_TYPE.resource
		);

		const organizerName = get(component, 'organizer.name') || get(component, 'organizer.address');

		const allInvitees = component.attendees || [];
		const inviteesname =
			allInvitees[0] && (allInvitees[0].name || allInvitees[0].address.split('@')[0]);
		return (
			<div>
				<div class={style.invitation}>
					<dl class={style.invitationInfo}>
						<dt>
							<Text id="invitations.labels.when" />
						</dt>
						<dd>
							<time>{date}</time>
						</dd>
						{component.location.trim().length > 0 && [
							<dt>
								<Text id="invitations.labels.location" />
							</dt>,
							<dd>
								<div class={style.plainText}>{component.location}</div>
							</dd>
						]}
						<dt>
							<Text id="invitations.labels.organizer" />
						</dt>
						<dd>
							<AddressList wrap={false} addresses={array(component.organizer)} />
						</dd>

						{invitees.length > 0 && [
							<dt>
								<Text id="invitations.labels.invitees" />
							</dt>,
							<dd>
								<AddressList wrap={false} addresses={array(invitees)} />
							</dd>
						]}

						{locations.length > 0 && [
							<dt>
								<Text id="invitations.labels.locationResource" />
							</dt>,
							<dd>
								<AddressList wrap={false} addresses={array(locations)} />
							</dd>
						]}

						{!isOrganizer &&
							!isAppointmentInTrash &&
							!isCancelledInvitation && [
								<dt>
									<Text id="appNavigation.calendar" />
								</dt>,
								<dd>
									{loading ? (
										''
									) : selectCalendars.length > 1 ? (
										<Select
											style={'max-width: 200px'}
											iconPosition="right"
											dropup
											onChange={linkState(this, 'calSelectId', 'value')}
											value={calSelectId || defaultCalId.toString()}
											class={style.select}
										>
											{selectCalendars.map(cal => (
												<Option
													icon={null}
													value={cal.id}
													class={style.calendarOption}
													selectText={cal.name}
												>
													<CalendarOptionItem calendar={cal} style={style} />
												</Option>
											))}
										</Select>
									) : (
										<div class={style.plainText}>{selectCalendars[0].name}</div>
									)}
								</dd>
							]}
						{component.recurrence && [
							<dt>
								<Text id="invitations.labels.repeats" />
							</dt>,
							<dd>
								{array(component.recurrence).map(recurrence => (
									<Recurrence recurrence={recurrence} class={style.recurrence} />
								))}
							</dd>
						]}

						{attendee && !isOrganizer && !isAppointmentInTrash && !isCancelledInvitation
							? [
									<dt class={style.rsvpTitle}>
										<Text id="invitations.labels.respond" />
									</dt>,
									<InvitationResponse
										inviteReplyInProgress={inviteReplyInProgress}
										InviteReplyVerb={InviteReplyVerb}
										handleReplyClick={this.handleReplyClick}
										attendee={attendee}
										message={message}
										nonRespondedStatus={nonRespondedStatus}
									/>
							  ]
							: allInvitees.length > 0 &&
							  allInvitees[0].participationStatus !== 'NE' && [
									<dt class={style.rsvpTitle}>
										<Text id="invitations.labels.respond" />
									</dt>,
									<dd>
										{[
											allInvitees[0].participationStatus === 'AC' && (
												<div class={style.inviteesResponse}>
													<Icon name="check-circle" class={style.accepted} />
													<span class={style.text}>
														<Text
															id="invitations.labels.invitationResponse.accepted"
															fields={{ inviteesname }}
														/>
													</span>
												</div>
											),
											allInvitees[0].participationStatus === 'DE' && (
												<div class={style.inviteesResponse}>
													<Icon name="close-circle" class={style.declined} />
													<span class={style.text}>
														<Text
															id="invitations.labels.invitationResponse.declined"
															fields={{ inviteesname }}
														/>
													</span>
												</div>
											),
											allInvitees[0].participationStatus === 'TE' && (
												<div class={style.inviteesResponse}>
													<Icon name="question-circle" class={style.tentative} />
													<span class={style.text}>
														<Text
															id="invitations.labels.invitationResponse.tentative"
															fields={{ inviteesname }}
														/>
													</span>
												</div>
											)
										]}
									</dd>
							  ]}
					</dl>
				</div>
				{!isOrganizer && isCancelledInvitation && (
					<div class={style.cancellationMessage}>
						<Text id="invitations.cancelledMessage" fields={{ organizerName }} />
					</div>
				)}
			</div>
		);
	}
}
