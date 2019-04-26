import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import { isTopLevelFolder } from '../../utils/folders';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import ContextMenuMoveFolder from '../context-menu-move-folder';
import ColorPicker from '../color-picker';
import { callWith, FLAGS } from '../../lib/util';
import { MODAL_ACTIONS } from '../calendar/constants';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { configure } from '../../config';
import { getIndividualFlag } from '../../utils/mail-list';
import { OUTBOX } from './../../constants/folders';
import get from 'lodash-es/get';
import { connect } from 'preact-redux';

import s from './style.less';

const MarkReadOption = ({ onMarkFolderRead, folder, isLocalFolder }) => (
	<ActionMenuItem
		onClick={onMarkFolderRead}
		disabled={!folder.unread || folder.unread === 0 || isLocalFolder}
	>
		<Text id="mail.contextMenu.MARK_READ" />
	</ActionMenuItem>
);

const EmptyOption = ({ onEmptyFolder, textId }) => (
	<ActionMenuItem onClick={onEmptyFolder}>
		<Text id={textId} />
	</ActionMenuItem>
);

export const InboxContextMenu = props => (
	<ActionMenuGroup>
		<MarkReadOption {...props} />
		{/*
			@TODO Zimbra SOAP does not support moving all email in a given folder
			which is required for this menu option

			<ActionMenuItem onClick={onArchive}>
				Archive all emails
			</ActionMenuItem>
		*/}
	</ActionMenuGroup>
);

export const SpamContextMenu = props => (
	<ActionMenuGroup>
		<MarkReadOption {...props} />
		<EmptyOption {...props} textId="mail.contextMenu.EMPTY_JUNK" />
	</ActionMenuGroup>
);

export const TrashContextMenu = props => (
	<ActionMenuGroup>
		<MarkReadOption {...props} />
		<EmptyOption {...props} textId="mail.contextMenu.EMPTY_TRASH" />
	</ActionMenuGroup>
);

export const SpecialFolderContextMenu = props => (
	<ActionMenuGroup>
		<MarkReadOption {...props} />
	</ActionMenuGroup>
);

export const FolderGroupContextMenu = ({ onCreateFolder, onFindFolder }) => (
	<ActionMenuGroup>
		<ActionMenuItem onClick={onCreateFolder}>
			<Text id="mail.contextMenu.CREATE_FOLDER" />
		</ActionMenuItem>
		<ActionMenuItem onClick={onFindFolder}>
			<Text id="mail.contextMenu.FIND_FOLDER" />
		</ActionMenuItem>
	</ActionMenuGroup>
);

export const ContactListContextMenu = ({ onRenameFolder, onDeleteFolder }) => (
	<ActionMenuGroup>
		<ActionMenuItem onClick={onRenameFolder}>
			<Text id="contacts.contextMenu.RENAME_LIST" />
		</ActionMenuItem>
		<ActionMenuItem onClick={onDeleteFolder}>
			<Text id="contacts.contextMenu.DELETE_LIST" />
		</ActionMenuItem>
	</ActionMenuGroup>
);

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@configure('showPrint')
export class MailContextMenu extends Component {
	flags = null;

	componentWillMount() {
		this.flags = getIndividualFlag(this.props.selectedIds, this.props.item.flags, 1);
		this.props.onMount && this.props.onMount();
	}

	render({
		isOffline,
		onMarkRead,
		onMarkUnread,
		onStar,
		onClearStar,
		onBlock,
		onMarkSpam,
		onArchive,
		onDelete,
		onShowOriginal,
		onAddSenderContacts,
		onPrint,
		matchesScreenMd,
		showPrint,
		folderName,
		localFolder,
		selectedIds
	}) {
		const regexp = new RegExp(`/${OUTBOX}$`);
		const isOutboxMessage = folderName === OUTBOX || folderName.match(regexp);
		return (
			<div>
				<ActionMenuGroup>
					<ActionMenuItem onClick={onMarkRead} disabled={localFolder}>
						<Text id="mail.contextMenu.MARK_AS_READ" />
					</ActionMenuItem>
					<ActionMenuItem onClick={onMarkUnread} disabled={localFolder}>
						<Text id="mail.contextMenu.MARK_AS_UNREAD" />
					</ActionMenuItem>
					<ActionMenuItem onClick={onStar} disabled={(isOffline && isOutboxMessage) || localFolder}>
						<Text id="mail.contextMenu.STAR" />
					</ActionMenuItem>
					<ActionMenuItem
						onClick={onClearStar}
						disabled={(isOffline && isOutboxMessage) || localFolder}
					>
						<Text id="mail.contextMenu.CLEAR_STAR" />
					</ActionMenuItem>
					<ActionMenuItem onClick={onBlock} disabled={isOffline}>
						<Text id="mail.contextMenu.BLOCK" />
					</ActionMenuItem>
				</ActionMenuGroup>
				{showPrint && (
					<ActionMenuGroup>
						<ActionMenuItem onClick={onPrint} disabled={isOffline}>
							<Text id="mail.contextMenu.PRINT" />
						</ActionMenuItem>
					</ActionMenuGroup>
				)}
				<ActionMenuGroup>
					{(this.flags
						? !(this.flags.includes(FLAGS.draft) || this.flags.includes(FLAGS.sentByMe))
						: true) && (
						<ActionMenuItem onClick={onMarkSpam} disabled={isOffline}>
							<Text id="mail.contextMenu.MARK_AS_SPAM" />
						</ActionMenuItem>
					)}
					{(this.flags ? !this.flags.includes(FLAGS.draft) : true) && (
						<ActionMenuItem onClick={onArchive} disabled={isOffline || !onArchive || localFolder}>
							<Text id="mail.contextMenu.ARCHIVE" />
						</ActionMenuItem>
					)}
					<ActionMenuItem onClick={onDelete} disabled={localFolder}>
						<Text id="mail.contextMenu.DELETE_MESSAGE" />
					</ActionMenuItem>
					{matchesScreenMd && (
						<ActionMenuItem
							onClick={onShowOriginal}
							disabled={isOffline || localFolder || selectedIds.size > 1}
						>
							<Text id="mail.contextMenu.showOriginal" />
						</ActionMenuItem>
					)}
				</ActionMenuGroup>
				<ActionMenuGroup>
					<ActionMenuItem onClick={onAddSenderContacts} disabled={isOffline}>
						<Text id="mail.contextMenu.ADD_SENDER_CONTACTS" />
					</ActionMenuItem>
				</ActionMenuGroup>
			</div>
		);
	}
}

export class DefaultFolderContextMenu extends Component {
	state = {
		showMoveFolderPicker: false
	};

	toggleShowMoveFolderPicker = e => {
		e.stopPropagation();
		this.setState({ showMoveFolderPicker: !this.state.showMoveFolderPicker });
	};

	handleMoveToTopLevel = () => {
		this.props.onMoveFolder();
	};

	render(
		{
			folder,
			folders,
			onMoveFolder,
			isSearchFolder,
			onRenameFolder,
			onDeleteFolder,
			onCreateSubFolder,
			onEditSearch,
			localFolders
		},
		{ showMoveFolderPicker }
	) {
		return (
			<div class={cx(s.defaultContainer, showMoveFolderPicker && s.showingPicker)}>
				{showMoveFolderPicker ? (
					<div>
						<ActionMenuGroup class={s.moveFolderGroup}>
							<ContextMenuMoveFolder
								activeFolder={folder}
								folders={folders}
								onMove={onMoveFolder}
								onCancelMove={this.toggleShowMoveFolderPicker}
								localFolders={localFolders}
							/>
						</ActionMenuGroup>
						<ActionMenuGroup>
							<ActionMenuItem
								onClick={this.handleMoveToTopLevel}
								disabled={isTopLevelFolder(folder)}
							>
								<Text id="mail.contextMenu.PLACE_TOP_LEVEL" />
							</ActionMenuItem>
						</ActionMenuGroup>
					</div>
				) : isSearchFolder ? (
					<div>
						<ActionMenuGroup>
							<ActionMenuItem onClick={onRenameFolder}>
								<Text id="mail.contextMenu.RENAME_SEARCH" />
							</ActionMenuItem>
							<ActionMenuItem onClick={onEditSearch}>
								<Text id="mail.contextMenu.EDIT_PROPERTIES" />
							</ActionMenuItem>
							<ActionMenuItem onClick={onDeleteFolder} disabled={folder.folder}>
								<Text id="mail.contextMenu.DELETE_SEARCH" />
							</ActionMenuItem>
						</ActionMenuGroup>
					</div>
				) : (
					<div>
						<ActionMenuGroup>
							<MarkReadOption {...this.props} />
						</ActionMenuGroup>
						<ActionMenuGroup>
							<ActionMenuItem onClick={onRenameFolder}>
								<Text id="mail.contextMenu.RENAME_FOLDER" />
							</ActionMenuItem>
							<ActionMenuItem
								onClick={this.toggleShowMoveFolderPicker}
								disabled={folder.isLocalFolder}
							>
								<Text id="mail.contextMenu.MOVE_FOLDER" />
							</ActionMenuItem>
							<ActionMenuItem onClick={onDeleteFolder} disabled={folder.folder}>
								<Text id="mail.contextMenu.DELETE_FOLDER" />
							</ActionMenuItem>
							<ActionMenuItem onClick={onCreateSubFolder} disabled={folder.isLocalFolder}>
								<Text id="mail.contextMenu.CREATE_SUBFOLDER" />
							</ActionMenuItem>
						</ActionMenuGroup>
					</div>
				)}
			</div>
		);
	}
}

export const CalendarMainContextMenu = ({ openModal }) => (
	<div>
		<ActionMenuGroup>
			<ActionMenuItem onClick={callWith(openModal, MODAL_ACTIONS.createCalendar)}>
				<Text id="calendar.actions.NEW_CALENDAR" />
			</ActionMenuItem>
		</ActionMenuGroup>
		<ActionMenuGroup>
			<ActionMenuItem onClick={callWith(openModal, MODAL_ACTIONS.createSharedCalendar)}>
				<Text id="calendar.actions.ADD_SHARED_CALENDAR" />
			</ActionMenuItem>
		</ActionMenuGroup>
	</div>
);

export const CalendarContextMenu = withMediaQuery(minWidth(screenMd), 'matchesScreenMd')(
	({
		colorValue,
		onEdit,
		onShare,
		onImport,
		onExport,
		onDelete,
		onUnlink,
		onChangeColor,
		disableShare,
		disableDelete,
		matchesScreenMd
	}) => (
		<div>
			<ActionMenuGroup>
				{onEdit && (
					<ActionMenuItem onClick={onEdit} narrow>
						<Text id="calendar.contextMenu.editCalendar" />
					</ActionMenuItem>
				)}
				{onShare && (
					<ActionMenuItem onClick={onShare} disabled={disableShare} narrow>
						<Text id="calendar.contextMenu.share" />
					</ActionMenuItem>
				)}
				{onImport && matchesScreenMd && (
					<ActionMenuItem onClick={onImport} narrow>
						<Text id="calendar.sidebar.actions.IMPORT_CALENDAR" />
					</ActionMenuItem>
				)}
				{onExport && matchesScreenMd && (
					<ActionMenuItem onClick={onExport} narrow>
						<Text id="calendar.sidebar.actions.EXPORT_CALENDAR" />
					</ActionMenuItem>
				)}
			</ActionMenuGroup>

			{onChangeColor && (
				<ActionMenuGroup>
					<ColorPicker class={s.colorPicker} value={colorValue} onChange={onChangeColor} />
				</ActionMenuGroup>
			)}

			{onDelete && (
				<ActionMenuGroup>
					<ActionMenuItem onClick={onDelete} disabled={disableDelete} narrow>
						<Text id="calendar.contextMenu.deleteCalendar" />
					</ActionMenuItem>
				</ActionMenuGroup>
			)}

			{onUnlink && (
				<ActionMenuGroup>
					<ActionMenuItem onClick={onUnlink} narrow>
						<Text id="calendar.contextMenu.unlink" />
					</ActionMenuItem>
				</ActionMenuGroup>
			)}
		</div>
	)
);

export const OtherCalendarContextMenu = ({
	colorValue,
	onEdit,
	onUnlink,
	onImport,
	onChangeColor,
	disableImport
}) => (
	<div>
		<ActionMenuGroup>
			<ActionMenuItem onClick={onEdit} narrow>
				<Text id="calendar.contextMenu.editCalendar" />
			</ActionMenuItem>

			{onImport && (
				<ActionMenuItem onClick={onImport} narrow disabled={disableImport}>
					<Text id="calendar.sidebar.actions.IMPORT_CALENDAR" />
				</ActionMenuItem>
			)}
		</ActionMenuGroup>

		{onChangeColor && (
			<ActionMenuGroup>
				<ColorPicker class={s.colorPicker} value={colorValue} onChange={onChangeColor} />
			</ActionMenuGroup>
		)}

		{onUnlink && (
			<ActionMenuGroup>
				<ActionMenuItem onClick={onUnlink} narrow>
					<Text id="calendar.contextMenu.unlink" />
				</ActionMenuItem>
			</ActionMenuGroup>
		)}
	</div>
);

export const OtherCalendarsSectionContextMenu = ({ onAddFriendsCalendarClicked }) => (
	<div>
		<ActionMenuGroup>
			<ActionMenuItem onClick={onAddFriendsCalendarClicked}>
				<Text id="calendar.contextMenu.linkShared" />
			</ActionMenuItem>
		</ActionMenuGroup>
	</div>
);

@connect(
	state => ({
		isOffline: get(state, 'network.isOffline')
	}),
	null
)
export class ContactContextMenu extends Component {
	componentWillMount() {
		this.props.onMount && this.props.onMount();
	}

	render({
		isDeletable,
		onEditDetails,
		onAssignToLists,
		onDeleteContact,
		onRemoveFromList,
		showPermanentlyDelete,
		isEditable,
		onShareContact,
		isOffline
	}) {
		return (
			<div>
				<ActionMenuGroup>
					{isEditable && (
						<ActionMenuItem onClick={onEditDetails} disabled={isOffline}>
							<Text id="contacts.contextMenu.editDetails" />
						</ActionMenuItem>
					)}

					<ActionMenuItem onClick={onAssignToLists} disabled={isOffline}>
						<Text id="contacts.contextMenu.assignToLists" />
					</ActionMenuItem>

					{onRemoveFromList && (
						<ActionMenuItem onClick={onRemoveFromList}>
							<Text id="contacts.contextMenu.removeFromList" />
						</ActionMenuItem>
					)}
					{isDeletable && (
						<ActionMenuItem onClick={onDeleteContact} disabled={isOffline}>
							{showPermanentlyDelete ? (
								<Text id="contacts.contextMenu.permanentlyDeleteContact" />
							) : (
								<Text id="contacts.contextMenu.deleteContact" />
							)}
						</ActionMenuItem>
					)}
					<ActionMenuItem onClick={onShareContact}>
						<Text id="contacts.contextMenu.shareContact" />
					</ActionMenuItem>
				</ActionMenuGroup>
			</div>
		);
	}
}
