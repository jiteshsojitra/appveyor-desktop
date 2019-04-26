import { h } from 'preact';
import { Text } from 'preact-i18n';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';

import s from './style.less';

export default function ActionMenuMailReply({
	onReply,
	onReplyAll,
	onForward,
	actionButtonClass,
	popoverClass,
	iconClass,
	replyToLength
}) {
	return (
		<ActionMenu
			icon="mail-reply"
			popoverClass={popoverClass}
			actionButtonClass={actionButtonClass}
			iconClass={iconClass}
			iconOnly
			arrow={false}
		>
			<DropDownWrapper>
				<ActionMenuGroup>
					<ActionMenuItem iconClass={s.icon} icon="mail-reply" onClick={onReply}>
						<Text id="buttons.reply" />
					</ActionMenuItem>
					{replyToLength > 1 && (
						<ActionMenuItem iconClass={s.icon} onClick={onReplyAll} icon="mail-reply-all">
							<Text id="buttons.replyToAll" />
						</ActionMenuItem>
					)}
					<ActionMenuItem iconClass={s.icon} onClick={onForward} icon="mail-forward">
						<Text id="buttons.forward" />
					</ActionMenuItem>
				</ActionMenuGroup>
			</DropDownWrapper>
		</ActionMenu>
	);
}
