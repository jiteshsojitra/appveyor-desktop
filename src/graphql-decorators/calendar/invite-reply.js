import { graphql } from 'react-apollo';
import { withText } from 'preact-i18n';
import { compose } from 'recompose';
import get from 'lodash/get';
import { connect } from 'preact-redux';
import SendInviteReply from '../../graphql/queries/send-invite-reply.graphql';
import { types as apiClientTypes } from '@zimbra/api-client';
import { getSenders } from '../../utils/mail-item';
import { getPrimaryAccountAddress, getAccountFromAddressForId } from '../../utils/account';
import { cloneWithoutTypeName } from '../../graphql/utils/graphql';
import MessageFragment from '../../graphql/fragments/message.graphql';
import { PARTICIPATION_STATUS } from '../../constants/calendars';
import withAccountInfo from '../account-info';
import { USER_FOLDER_IDS } from '../../constants';
import {
	optimisticRemoveFromFolder,
	findFolderInCache,
	optimisticSetInviteResponse
} from '../../graphql/utils/graphql-optimistic';
import getContext from '../../lib/get-context';

const { InviteReplyVerb } = apiClientTypes;

function setParticipationStatus(verb) {
	switch (verb) {
		case InviteReplyVerb.Accept:
			return PARTICIPATION_STATUS.accept;
		case InviteReplyVerb.Tentative:
			return PARTICIPATION_STATUS.tentative;
		case InviteReplyVerb.Decline:
			return PARTICIPATION_STATUS.declined;
	}
}
export default function withSendInviteReply() {
	return compose(
		withText({
			accept: 'buttons.accept',
			tentative: 'buttons.tentative',
			decline: 'buttons.decline'
		}),
		withAccountInfo(),
		getContext(({ changeActiveMessage }) => ({
			changeActiveMessage
		})),
		connect(
			state => ({
				activeAccountId: get(state, 'activeAccount.id')
			}),
			null
		),
		graphql(SendInviteReply, {
			props: ({
				mutate,
				ownProps: { account, accept, tentative, decline, activeAccountId, changeActiveMessage }
			}) => ({
				sendInviteReply: ({
					verb,
					updateOrganizer,
					message,
					isCalendarView,
					inviteId,
					calendarId,
					owner
				}) => {
					if (message) {
						const messageSubject =
							message.subject || get(message, 'invitations.0.components.0.name');
						const respondedBefore =
							messageSubject.includes(accept) ||
							messageSubject.includes(decline) ||
							messageSubject.includes(tentative);

						let subject = '',
							replyMessage;

						const index = messageSubject.indexOf(':');

						subject = respondedBefore
							? messageSubject.slice(index + 1, messageSubject.length)
							: messageSubject;

						switch (verb) {
							case InviteReplyVerb.Accept:
								subject = `${accept}: ${subject}`;
								break;
							case InviteReplyVerb.Tentative:
								subject = `${tentative}: ${subject}`;
								break;
							case InviteReplyVerb.Decline:
								subject = `${decline}: ${subject}`;
								break;
						}

						if (updateOrganizer !== false) {
							let sender = getSenders(message).map(({ address }) => ({ address, type: 't' }));

							if (sender.length === 0 && owner) {
								sender = [
									{
										address: get(message, 'invitations.0.components.0.organizer.address'),
										type: 't'
									},
									{
										address: owner,
										type: 'f'
									}
								];
							}
							const htmlPart = get(
								message,
								'invitations.0.components.0.htmlDescription.0._content'
							);
							const sharedMimeParts = [
								{
									contentType: 'multipart/alternative',
									mimeParts: [
										{
											contentType: 'text/html',
											content: htmlPart || ''
										}
									]
								}
							];

							replyMessage = {
								message: {
									emailAddresses: [
										...sender,
										{
											address: isCalendarView
												? getPrimaryAccountAddress(account)
												: getAccountFromAddressForId(account, activeAccountId),
											type: owner ? 's' : 'f'
										}
									],
									//TODO: add idnt (this represents the identity Id and specifies the folder where the sent message is saved.)
									mimeParts: owner ? sharedMimeParts : cloneWithoutTypeName(message.mimeParts),
									replyType: 'r',
									subject
								}
							};
						}

						account.prefs.zimbraPrefDeleteInviteOnReply &&
							!isCalendarView &&
							message.folderId !== USER_FOLDER_IDS.TRASH.toString() &&
							changeActiveMessage &&
							changeActiveMessage([message.conversationId || message.id]);

						return mutate({
							variables: {
								inviteReply: {
									id: message.id,
									componentNum: 0, // TODO: Support multi-component invites
									verb,
									updateOrganizer: updateOrganizer !== false,
									...replyMessage
								}
							},
							optimisticResponse: {
								sendInviteReply: {
									__typename: 'Mutation'
								}
							},
							update: proxy => {
								if (
									isCalendarView ||
									message.folderId === USER_FOLDER_IDS.TRASH.toString() ||
									!account.prefs.zimbraPrefDeleteInviteOnReply
								) {
									const participationStatusToSet = setParticipationStatus(verb);

									const data = proxy.readFragment({
										id: `MessageInfo:${message.id}`,
										fragment: MessageFragment,
										fragmentName: 'messageFields'
									});

									const replies = get(data, 'invitations.0.replies.0.reply');
									const reply =
										replies && replies.find(a => (owner || account.name) === a.attendee);

									if (reply) {
										reply.participationStatus = participationStatusToSet;
									} else {
										// When responding for the 1st time, reply would be null. Thus add fabricated reply array into cache so that optimistic UI works.
										const invitation = get(data, 'invitations.0');
										invitation.replies = [
											{
												reply: [
													{
														attendee: owner || account.name,
														participationStatus: null,
														__typename: 'CalendarItemReply'
													}
												],
												__typename: 'InviteReplies'
											}
										];
										invitation.replies[0].reply[0].participationStatus = participationStatusToSet;
									}

									proxy.writeFragment({
										id: `MessageInfo:${message.id}`,
										fragment: MessageFragment,
										fragmentName: 'messageFields',
										data: {
											__typename: 'MessageInfo',
											...data
										}
									});

									// Update cache so that appointment status is reflected into getFolder query. Thus declined invites are removed from calendar.
									inviteId &&
										optimisticSetInviteResponse(
											proxy,
											calendarId,
											inviteId,
											participationStatusToSet
										);
								}

								if (account.prefs.zimbraPrefDeleteInviteOnReply && !owner) {
									optimisticRemoveFromFolder(
										proxy,
										findFolderInCache(proxy, folder => folder.id === message.folderId).name,
										message,
										account.prefs.zimbraPrefGroupMailBy === 'conversation'
									);
								}
							}
						});
					}

					return null;
				}
			})
		})
	);
}
