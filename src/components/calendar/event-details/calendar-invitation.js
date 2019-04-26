import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import get from 'lodash/get';
import style from './style';
import { types as apiClientTypes } from '@zimbra/api-client';
import { PARTICIPATION_STATUS } from '../../../constants/calendars';
import withAccountInfo from '../../../graphql-decorators/account-info';
import withSendInviteReply from '../../../graphql-decorators/calendar/invite-reply';
import { notify } from '../../../store/notifications/actions';
import { connect } from 'preact-redux';
import InvitationResponse from '../../invitation-response';
import { branch, renderNothing, withProps } from 'recompose';

const { InviteReplyVerb } = apiClientTypes;

@withSendInviteReply()
@connect(
	null,
	{ notify }
)
@withAccountInfo()
@withProps(({ message, account, owner }) => {
	if (message) {
		let attendee = null,
			nonRespondedStatus = null;
		const participationIds = [
			PARTICIPATION_STATUS.accept,
			PARTICIPATION_STATUS.tentative,
			PARTICIPATION_STATUS.declined
		];
		const invitation = get(message, 'invitations.0.components.0');
		const isOrganizer = invitation.isOrganizer || false;
		const replies = get(message, 'invitations.0.replies[0].reply', null);
		const accountName = owner || account.name;

		if (!isOrganizer) {
			attendee = replies
				? replies.find(a => accountName === a.attendee)
				: invitation.attendees.find(a => accountName === a.address);

			nonRespondedStatus =
				attendee &&
				participationIds.filter(participation => attendee.participationStatus !== participation);
		}

		return {
			isOrganizer,
			isCancelledInvitation: get(invitation, 'status') === 'CANC',
			attendee,
			message,
			nonRespondedStatus
		};
	}
})
@branch(
	({ attendee, isOrganizer, isCancelledInvitation }) =>
		!attendee || isOrganizer || isCancelledInvitation,
	renderNothing
)
export default class CalendarInvitation extends Component {
	state = {
		inviteReplyInProgress: false
	};

	handleReplyClick = verb => {
		const {
			sendInviteReply,
			message,
			inviteId,
			owner,
			calendarId,
			notify: sentNotify
		} = this.props;

		this.setState({ inviteReplyInProgress: true });

		sendInviteReply({
			verb,
			message,
			isCalendarView: true,
			inviteId,
			calendarId,
			owner
		}).then(() => {
			this.setState({ inviteReplyInProgress: false });

			sentNotify({
				message: <Text id="mail.notifications.sent" />
			});
		});
	};

	render({ attendee, message, nonRespondedStatus, permission }, { inviteReplyInProgress }) {
		return (
			<div class={style.attendee}>
				<InvitationResponse
					inviteReplyInProgress={inviteReplyInProgress}
					InviteReplyVerb={InviteReplyVerb}
					handleReplyClick={this.handleReplyClick}
					attendee={attendee}
					message={message}
					nonRespondedStatus={nonRespondedStatus}
					permission={permission}
				/>
			</div>
		);
	}
}
