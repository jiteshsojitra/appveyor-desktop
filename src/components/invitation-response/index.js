import { h } from 'preact';
import { Icon, Button, Select, Option } from '@zimbra/blocks';
import { callWith } from '../../lib/util';
import { Text } from 'preact-i18n';
import { PARTICIPATION_STATUS, SHARED_CALENDAR_PERMISSION } from '../../constants/calendars';
import { USER_FOLDER_IDS } from '../../constants';
import Item from '../menu-item';
import InvitationOptionItem from './invitation-option-item';
import style from './style';

export default function InvitationResponse({
	inviteReplyInProgress,
	InviteReplyVerb,
	handleReplyClick,
	attendee,
	message,
	nonRespondedStatus,
	permission
}) {
	const hasDeletePermissionForSharedCalendar = permission
		? permission.includes(SHARED_CALENDAR_PERMISSION.delete)
		: true;
	return (
		<dd class={style.rsvp}>
			{attendee.participationStatus === PARTICIPATION_STATUS.needsAction ? (
				!hasDeletePermissionForSharedCalendar ? (
					<Text id="calendar.dialogs.share.eventNotResponded" fields={{ name: attendee.name }} />
				) : (
					[
						<Button
							disabled={inviteReplyInProgress}
							onClick={callWith(handleReplyClick, InviteReplyVerb.Accept)}
							styleType="coloredText"
							brand="success"
							iconName="check-circle"
						>
							<div class={style.buttonText}>
								<Text id="buttons.accept" />
							</div>
						</Button>,
						<Button
							disabled={inviteReplyInProgress}
							onClick={callWith(handleReplyClick, InviteReplyVerb.Tentative)}
							styleType="coloredText"
							brand="info"
							iconName="question-circle"
						>
							<div class={style.buttonText}>
								<Text id="buttons.tentative" />
							</div>
						</Button>,
						<Button
							disabled={inviteReplyInProgress}
							onClick={callWith(handleReplyClick, InviteReplyVerb.Decline)}
							styleType="coloredText"
							brand="danger"
							iconName="close-circle"
						>
							<div class={style.buttonText}>
								<Text id="buttons.decline" />
							</div>
						</Button>
					]
				)
			) : hasDeletePermissionForSharedCalendar &&
			  message.folderId !== USER_FOLDER_IDS.SENT.toString() ? (
				<Select
					showTooltip={false}
					iconPosition={null}
					dropdown
					class={style.select}
					value={
						<span class={style.invitationItemInline}>
							{[
								attendee.participationStatus === PARTICIPATION_STATUS.accept && (
									<Item
										class={style.invitationItem}
										iconClass={style.success}
										icon={'check-circle'}
									>
										<span>
											<Text id="buttons.accepted" />
										</span>
										<span>
											<Icon class={style.down} name="angle-down" size="xs" />
										</span>
									</Item>
								),

								attendee.participationStatus === PARTICIPATION_STATUS.tentative && (
									<Item
										class={style.invitationItem}
										iconClass={style.info}
										icon={'question-circle'}
									>
										<span>
											<Text id="buttons.tentative" />
										</span>
										<span>
											<Icon class={style.down} name="angle-down" size="xs" />
										</span>
									</Item>
								),

								attendee.participationStatus === PARTICIPATION_STATUS.declined && (
									<Item class={style.invitationItem} iconClass={style.danger} icon={'close-circle'}>
										<span>
											<Text id="buttons.declined" />
										</span>
										<span>
											<Icon class={style.down} name="angle-down" size="xs" />
										</span>
									</Item>
								)
							].filter(Boolean)}
						</span>
					}
				>
					{nonRespondedStatus.map(participation => (
						<Option icon={null} class={style.invitationOption}>
							<InvitationOptionItem
								handleClick={handleReplyClick}
								participationStatus={participation}
							/>
						</Option>
					))}
				</Select>
			) : (
				[
					attendee.participationStatus === PARTICIPATION_STATUS.accept && (
						<Item class={style.invitationItem} iconClass={style.success} icon={'check-circle'}>
							<span>
								<Text id="buttons.accepted" />
							</span>
						</Item>
					),

					attendee.participationStatus === PARTICIPATION_STATUS.tentative && (
						<Item class={style.invitationItem} iconClass={style.info} icon={'question-circle'}>
							<span>
								<Text id="buttons.tentative" />
							</span>
						</Item>
					),

					attendee.participationStatus === PARTICIPATION_STATUS.declined && (
						<Item class={style.invitationItem} iconClass={style.danger} icon={'close-circle'}>
							<span>
								<Text id="buttons.declined" />
							</span>
						</Item>
					)
				].filter(Boolean)
			)}
		</dd>
	);
}
