import { h } from 'preact';
import Item from '../menu-item';
import { Text } from 'preact-i18n';
import style from './style';
import { types as apiClientTypes } from '@zimbra/api-client';
import { callWith } from '../../lib/util';
import { PARTICIPATION_STATUS } from '../../constants/calendars';

const { InviteReplyVerb } = apiClientTypes;
export default function InvitationOptionItem({ handleClick, participationStatus }) {
	let iconStyle, iconName, textId, inviteReplyVerb;
	switch (participationStatus) {
		case PARTICIPATION_STATUS.accept:
			textId = 'buttons.accept';
			iconStyle = style.success;
			iconName = 'check-circle';
			inviteReplyVerb = InviteReplyVerb.Accept;
			break;

		case PARTICIPATION_STATUS.tentative:
			textId = 'buttons.tentative';
			iconStyle = style.info;
			iconName = 'question-circle';
			inviteReplyVerb = InviteReplyVerb.Tentative;
			break;

		case PARTICIPATION_STATUS.declined:
			textId = 'buttons.decline';
			iconStyle = style.danger;
			iconName = 'close-circle';
			inviteReplyVerb = InviteReplyVerb.Decline;
			break;
	}

	return (
		<Item
			class={style.invitationItem}
			iconClass={iconStyle}
			icon={iconName}
			onClick={callWith(handleClick, inviteReplyVerb)}
		>
			<span>
				<Text id={textId} />
			</span>
		</Item>
	);
}
