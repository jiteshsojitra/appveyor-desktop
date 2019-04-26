import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import ZimletSlot from '../zimlet-slot';
import { configure } from '../../config';

@withText({
	moreLabel: 'buttons.more'
})
@configure('showPrint')
export default class ActionMenuMailMore extends Component {
	render({
		disabled,
		iconOnly,
		monotone,
		arrow,
		actionButtonClass,
		popoverClass,
		isUnread,
		isStarred,
		onDelete,
		onMarkRead,
		onFlag,
		onBlock,
		onShowOriginal,
		onPrint,
		isOffline,
		moreLabel,
		emailData,
		showPrint,
		localFolder
	}) {
		return (
			<ActionMenu
				actionButtonClass={actionButtonClass}
				icon="ellipsis-h"
				iconSize="md"
				iconOnly={iconOnly}
				label={moreLabel}
				disabled={disabled}
				monotone={monotone}
				arrow={arrow}
				popoverClass={popoverClass}
			>
				<DropDownWrapper>
					<ActionMenuGroup>
						<ActionMenuItem onClick={onDelete} disabled={localFolder}>
							<Text id="mail.contextMenu.DELETE_MESSAGE" />
						</ActionMenuItem>
						<ActionMenuItem onClick={onMarkRead} disabled={localFolder}>
							<Text id={`mail.contextMenu.MARK_AS_${isUnread ? '' : 'UN'}READ`} />
						</ActionMenuItem>
						<ActionMenuItem onClick={onFlag} disabled={(isOffline && !onFlag) || localFolder}>
							<Text id={`mail.contextMenu.${isStarred ? 'CLEAR_' : ''}STAR`} />
						</ActionMenuItem>
						<ActionMenuItem onClick={onBlock} disabled={isOffline}>
							<Text id="mail.contextMenu.BLOCK" />
						</ActionMenuItem>
						<ActionMenuItem onClick={onShowOriginal} disabled={isOffline}>
							<Text id="mail.contextMenu.showOriginal" />
						</ActionMenuItem>
					</ActionMenuGroup>
					{showPrint ? (
						<ActionMenuGroup>
							<ActionMenuItem onClick={onPrint} disabled={isOffline || localFolder}>
								<Text id="mail.contextMenu.PRINT" />
							</ActionMenuItem>
							<ZimletSlot name="action-menu-mail-more" emailData={emailData} />
						</ActionMenuGroup>
					) : (
						<ZimletSlot name="action-menu-mail-more" emailData={emailData} />
					)}
				</DropDownWrapper>
			</ActionMenu>
		);
	}
}
