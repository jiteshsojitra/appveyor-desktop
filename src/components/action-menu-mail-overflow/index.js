import { h } from 'preact';
import { callWith, FLAGS } from '../../lib/util';
import { Text } from 'preact-i18n';
import { canSpam } from '../../utils/folders';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import ZimletSlot from '../zimlet-slot';

export default function ActionMenuMailOverflow({
	isOffline,
	disabled,
	onMarkRead,
	onFlag,
	onBlock,
	multiple,
	read,
	flagged,
	iconOnly,
	monotone,
	arrow,
	actionButtonClass,
	popoverClass,
	onPrint,
	matchesScreenMd,
	onSpam,
	onShowOriginal,
	inSpam,
	emailData,
	flags,
	folderName,
	selectedIds
}) {
	const isSpamEnabled =
		!matchesScreenMd &&
		canSpam(folderName) &&
		(flags ? !(flags.includes(FLAGS.draft) || flags.includes(FLAGS.sentByMe)) : true);
	return (
		<ActionMenu
			actionButtonClass={actionButtonClass}
			icon="ellipsis-h"
			iconSize="md"
			iconOnly={iconOnly}
			label="More"
			disabled={disabled}
			monotone={monotone}
			arrow={arrow}
			popoverClass={popoverClass}
		>
			<DropDownWrapper>
				{multiple ? (
					<ActionMenuGroup>
						<ActionMenuItem onClick={callWith(onMarkRead, true)}>
							<Text id="mail.contextMenu.MARK_AS_READ" />
						</ActionMenuItem>
						<ActionMenuItem onClick={callWith(onMarkRead, false)}>
							<Text id="mail.contextMenu.MARK_AS_UNREAD" />
						</ActionMenuItem>
						<ActionMenuItem onClick={callWith(onFlag, true)}>
							<Text id="mail.contextMenu.STAR" />
						</ActionMenuItem>
						<ActionMenuItem onClick={callWith(onFlag, false)}>
							<Text id="mail.contextMenu.CLEAR_STAR" />
						</ActionMenuItem>
						{isSpamEnabled && (
							<ActionMenuItem onClick={callWith(onSpam, !inSpam)}>
								<Text id={`mail.contextMenu.MARK_AS_${inSpam ? 'NOT_SPAM' : 'SPAM'}`} />
							</ActionMenuItem>
						)}
						<ActionMenuItem onClick={onBlock} disabled={isOffline || !onBlock}>
							<Text id="mail.contextMenu.BLOCK" />
						</ActionMenuItem>
						{matchesScreenMd && (
							<ActionMenuItem onClick={onShowOriginal} disabled={isOffline || selectedIds.size > 1}>
								<Text id="mail.contextMenu.showOriginal" />
							</ActionMenuItem>
						)}
					</ActionMenuGroup>
				) : (
					<div>
						<ActionMenuGroup>
							<ActionMenuItem onClick={callWith(onMarkRead, !read)}>
								<Text id={`mail.contextMenu.MARK_AS_${read ? 'UN' : ''}READ`} />
							</ActionMenuItem>
							<ActionMenuItem onClick={callWith(onFlag, !flagged)}>
								<Text id={`mail.contextMenu.${flagged ? 'CLEAR_' : ''}STAR`} />
							</ActionMenuItem>
							<ActionMenuItem onClick={onBlock} disabled={isOffline || !onBlock}>
								<Text id="mail.contextMenu.BLOCK" />
							</ActionMenuItem>
							{isSpamEnabled && (
								<ActionMenuItem onClick={callWith(onSpam, !inSpam)}>
									<Text id={`mail.contextMenu.MARK_AS_${inSpam ? 'NOT_SPAM' : 'SPAM'}`} />
								</ActionMenuItem>
							)}
							{matchesScreenMd && (
								<ActionMenuItem onClick={onShowOriginal} disabled={isOffline}>
									<Text id="mail.contextMenu.showOriginal" />
								</ActionMenuItem>
							)}
							<ZimletSlot name="action-menu-mail-more" emailData={emailData} />
						</ActionMenuGroup>
						{onPrint && matchesScreenMd && (
							<ActionMenuGroup>
								<ActionMenuItem onClick={onPrint} disabled={isOffline}>
									<Text id="mail.contextMenu.PRINT" />
								</ActionMenuItem>
							</ActionMenuGroup>
						)}
					</div>
				)}
			</DropDownWrapper>
		</ActionMenu>
	);
}
