import { h } from 'preact';
import cx from 'classnames';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { callWith, FLAGS } from '../../lib/util';
import { isUnread, isFlagged, getIdForShowOriginalMime } from '../../utils/mail-item';

import {
	inFolder,
	canReplyForward,
	canDelete,
	canArchive,
	canMove,
	canSpam,
	canEdit,
	canMore
} from '../../utils/folders';
import { minWidth, screenSm, screenMd } from '../../constants/breakpoints';
import { Text } from 'preact-i18n';
import ActionButton from '../action-button';
import ActionMenuMoveFolder from '../action-menu-move-folder';
import ActionMenuMailOverflow from '../action-menu-mail-overflow';
import withMediaQuery from '../../enhancers/with-media-query';
import { getIndividualFlag } from '../../utils/mail-list';
import s from './style.less';

const MailActions = ({
	isOffline,
	isAttachmentViewerOpen,
	isMediaMenuOpen,
	currentFolder,
	disabled,
	folders,
	multiple,
	singleMailItem,
	singleMailItemType,
	onArchive,
	onBlock,
	onDelete,
	onEdit,
	onFlag,
	onSpam,
	onShowOriginal,
	onMarkRead,
	onMove,
	onReply,
	onReplyAll,
	onForward,
	onPrint,
	hideReplyActions,
	hideMessageNavigation,
	handleNext,
	handlePrevious,
	handleClose,
	matchesMediaQuery,
	flagOfCurrentMessage,
	selectedIds,
	matchesScreenSm,
	matchesScreenMd,
	localFolder,
	disableLocalFolderForMove,
	...rest
}) => {
	const showMessageNavigation = !hideMessageNavigation;
	const inSpam = inFolder(currentFolder, 'junk');
	const inArchive = inFolder(currentFolder, 'archive');
	const read = singleMailItem && !isUnread(singleMailItem);
	const flagged = singleMailItem && isFlagged(singleMailItem);
	const { name: folderName } = currentFolder || {};
	const showReplyActions = !hideReplyActions && canReplyForward(folderName);

	const flags = getIndividualFlag(selectedIds, flagOfCurrentMessage, 0);

	const { to, cc } = singleMailItem || {};
	const replyToLength = (to || []).length + (cc || []).length;

	const selectedIdsInfo = Array.from(selectedIds);

	// Get respective id based on checks like, whether single item is checked,
	// OR Email is open in email-viewer-pane but it's not checked.
	// In case of multiple, we are not showing 'show original' option.
	const showOriginalId =
		selectedIds &&
		(selectedIds.size === 1
			? getIdForShowOriginalMime(selectedIdsInfo[0])
			: selectedIds.size === 0 && getIdForShowOriginalMime(singleMailItem, false));

	return (
		<div class={cx(s.viewerToolbar, rest.class)} disabled={disabled}>
			{showReplyActions && onReply && (
				<ActionButton icon="mail-reply" onClick={onReply} disabled={disabled || multiple} />
			)}
			{showReplyActions && onReplyAll && (
				<ActionButton
					icon="mail-reply-all"
					onClick={onReplyAll}
					disabled={disabled || multiple || replyToLength === 1}
				/>
			)}
			{showReplyActions && onForward && (
				<ActionButton icon="mail-forward" onClick={onForward} disabled={disabled || multiple} />
			)}
			{canArchive(folderName) && (flags ? !flags.includes(FLAGS.draft) : true) && (
				<ActionButton
					icon={inArchive ? 'envelope' : 'archive'}
					iconOnly={isAttachmentViewerOpen || !matchesMediaQuery}
					onClick={callWith(onArchive, !inArchive)}
					disabled={isOffline || disabled || localFolder}
				>
					{inArchive ? 'Restore to Inbox' : 'Archive'}
				</ActionButton>
			)}
			{canMove(folderName) && (
				<ActionMenuMoveFolder
					folders={folders}
					onMove={onMove}
					flags={flags}
					disabled={isOffline || disabled}
					iconOnly={isAttachmentViewerOpen || !matchesMediaQuery}
					arrow={matchesMediaQuery}
					disableLocalFolderForMove={disableLocalFolderForMove}
				/>
			)}
			{canEdit(folderName) && (
				<ActionButton
					icon="pencil"
					iconOnly={isAttachmentViewerOpen || !matchesMediaQuery}
					onClick={onEdit}
					disabled={disabled || multiple || localFolder}
				>
					<Text id="buttons.edit" />
				</ActionButton>
			)}
			{canDelete(folderName) && (
				<ActionButton
					icon="trash"
					iconOnly={isAttachmentViewerOpen || !matchesMediaQuery}
					onClick={callWith(onDelete)} //make sure the default event does not get passed to onDelete as it is expecting an id or null to use defaults
					disabled={disabled || localFolder}
				>
					<Text id="buttons.delete" />
				</ActionButton>
			)}
			{canSpam(folderName) &&
				(flags ? !(flags.includes(FLAGS.draft) || flags.includes(FLAGS.sentByMe)) : true) && (
					<ActionButton
						icon="shield"
						iconOnly={isAttachmentViewerOpen || !matchesMediaQuery}
						disabled={isOffline || disabled || localFolder}
						onClick={callWith(onSpam, !inSpam)}
					>
						{inSpam ? 'Not Spam' : 'Spam'}
					</ActionButton>
				)}
			{canMore(folderName) && (
				<ActionMenuMailOverflow
					popoverClass={s.overflowPopoverContainer}
					onMarkRead={onMarkRead}
					onFlag={onFlag}
					onBlock={onBlock}
					onShowOriginal={callWith(onShowOriginal, showOriginalId)}
					onPrint={onPrint}
					matchesScreenSm={matchesScreenSm}
					matchesScreenMd={matchesScreenMd}
					multiple={multiple}
					selectedIds={selectedIds}
					disabled={disabled || localFolder}
					read={read}
					flagged={flagged}
					arrow={matchesMediaQuery}
					iconOnly={isAttachmentViewerOpen || !matchesMediaQuery}
					emailData={singleMailItem}
					isOffline={isOffline}
				/>
			)}
			{(showMessageNavigation || isAttachmentViewerOpen) && (
				<div class={s.messageNavigation}>
					<ActionButton class={s.button} icon="arrow-up" onClick={handlePrevious} />
					<ActionButton class={s.button} icon="arrow-down" onClick={handleNext} />
					<ActionButton class={s.button} icon="close" onClick={handleClose} />
				</div>
			)}
		</div>
	);
};

MailActions.defaultProps = {
	disabled: false,
	hideReplyActions: false,
	hideMessageNavigation: false
};

MailActions.propTypes = {
	disabled: PropTypes.bool,
	onArchive: PropTypes.func.isRequired,
	onDelete: PropTypes.func.isRequired
};

export default compose(
	// action button labels start running into eachother, hide them
	withMediaQuery(minWidth(1200)),
	withMediaQuery(minWidth(screenMd), 'matchesScreenMd'),
	withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
)(MailActions);
