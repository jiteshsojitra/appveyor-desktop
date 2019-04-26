import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import get from 'lodash/get';
import Toolbar from '../toolbar';
import ToolbarSidebarButton from '../toolbar/sidebar-button';
import ToolbarSVGActionButton from '../toolbar/svg-action-button';
import ToolbarActionButton from '../toolbar/action-button';
import ToolbarTitle from '../toolbar/title';
import ActionMenuMoveFolder from '../action-menu-move-folder';
import ActionMenuMailOverflow from '../action-menu-mail-overflow';
import { SearchEasingButton } from '../search-easing';
import { inFolder, canEdit, canDelete, canArchive, canMove, canMore } from '../../utils/folders';
import { getIndividualFlag } from '../../utils/mail-list';
import { configure } from '../../config';
import { callWith } from '../../lib/util';
import { getAccountFromAddressForId } from '../../utils/account';
import { isUnread, isFlagged } from '../../utils/mail-item';
import s from './style.less';

@configure('routes.slugs')
@connect(state => ({
	activeAccountId: get(state, 'activeAccount.id')
}))
export default class MailToolbar extends Component {
	render({
		isOffline,
		activeAccountId,
		account,
		folders,
		singleMailItem,
		disabled,
		hideContextActions,
		hideBackButton,
		isAttachmentViewerOpen,
		onMove,
		onSpam,
		onDelete,
		onEdit,
		onFlag,
		onMarkRead,
		onBlock,
		onCompose,
		multiple,
		onArchive,
		currentFolder,
		archivedFolder,
		openSearchBar,
		flagOfCurrentMessage,
		selectedIds,
		slugs,
		disableLocalFolderForMove
	}) {
		const read = singleMailItem && !isUnread(singleMailItem);
		const inSpam = inFolder(currentFolder, 'junk');
		const flagged = singleMailItem && isFlagged(singleMailItem);
		const inArchive = currentFolder && currentFolder.id === archivedFolder;
		const showTitle = hideBackButton || hideContextActions;
		const { name: folderName } = currentFolder || {};
		const flags = getIndividualFlag(selectedIds, flagOfCurrentMessage, 0);
		return (
			<Toolbar>
				{showTitle ? (
					<ToolbarSidebarButton className={s.actionButton} />
				) : (
					<ToolbarSVGActionButton href={`/${slugs.email}/${folderName}`} iconClass="arrow-left" />
				)}
				{showTitle && (
					<ToolbarTitle
						text="mail.title"
						subtitle={getAccountFromAddressForId(account, activeAccountId)}
					/>
				)}
				{hideContextActions ? (
					<div class={s.actionButtons}>
						<SearchEasingButton open={openSearchBar} />

						<ToolbarActionButton onClick={onCompose} icon="pencil" className={s.composeButton} />
					</div>
				) : (
					<div class={s.actionButtons}>
						{canEdit(folderName) && <ToolbarActionButton icon="pencil" onClick={onEdit} />}
						{canDelete(folderName) && (
							<ToolbarActionButton icon="trash" onClick={callWith(onDelete)} />
						)}
						{canArchive(folderName) && (
							<ToolbarActionButton
								icon={inArchive ? 'envelope' : 'archive'}
								onClick={callWith(onArchive, !inArchive)}
							/>
						)}
						{canMove(folderName) && (
							<ActionMenuMoveFolder
								actionButtonClass={s.actionButton}
								popoverClass={s.popoverContainer}
								folders={folders}
								onMove={onMove}
								monotone
								iconOnly
								arrow={false}
								disabled={isOffline}
								disableLocalFolderForMove={disableLocalFolderForMove}
							/>
						)}
						{canMore(folderName) && (
							<ActionMenuMailOverflow
								actionButtonClass={s.actionButton}
								popoverClass={s.popoverContainer}
								onMarkRead={onMarkRead}
								onFlag={onFlag}
								onBlock={onBlock}
								onSpam={onSpam}
								inSpam={inSpam}
								multiple={multiple}
								isAttachmentViewerOpen={isAttachmentViewerOpen}
								disabled={disabled}
								read={read}
								flagged={flagged}
								monotone
								iconOnly
								arrow={false}
								emailData={singleMailItem}
								isOffline={isOffline}
								flags={flags}
								folderName={folderName}
							/>
						)}
					</div>
				)}
			</Toolbar>
		);
	}
}
