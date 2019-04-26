import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { configure } from '../../config';
import { route } from 'preact-router';
import { Text, withText } from 'preact-i18n';
import wire from 'wiretie';
import cx from 'classnames';
import mitt from 'mitt';
import flatMap from 'lodash-es/flatMap';
import uniq from 'lodash-es/uniq';
import get from 'lodash-es/get';
import findIndex from 'lodash-es/findIndex';
import castArray from 'lodash-es/castArray';
import first from 'lodash-es/first';
import upperFirst from 'lodash-es/upperFirst';
import queryString from 'query-string';
import { findFolderInCache } from '../../graphql/utils/graphql-optimistic';
import { KeyCodes, Icon } from '@zimbra/blocks';
import { types as apiClientTypes } from '@zimbra/api-client';

import { FORWARD, REPLY, REPLY_ALL } from '../../constants/mail';
import { conversation as conversationType } from '../../constants/types';
import { minWidth, screenSm, screenMd } from '../../constants/breakpoints';
import {
	ReadingPaneSashHorizontalDefault,
	ReadingPaneSashVerticalDefault,
	MailListPaneMaxGrowthThreshold,
	MailListPaneMinShrinkThreshold
} from '../../constants/mailbox-metadata';

import { callWith } from '../../lib/util';
import { trimMailFolderViewFromUri } from '../../utils/routing';
import newMessageDraft from '../../utils/new-message-draft';
import { withoutAccountAddresses } from '../../utils/account';
import { getSenders, isUnread } from '../../utils/mail-item';

import { clearSelected, toggleSelected, toggleAllSelected } from '../../store/mail/actions';
import { getSelectedIds } from '../../store/mail/selectors';
import { openModalCompose } from '../../store/email/actions';
import { notify } from '../../store/notifications/actions';
import { removeTab } from '../../store/navigation/actions';
import { getAttachmentPreviewVisibility } from '../../store/attachment-preview/selectors';

import MailList from '../mail-list';
import MailListHeader from '../mail-list-header';
import MailActions from '../mail-actions';
import MailLoadingFooter from '../mail-loading-footer';
import MailToolbar from '../mail-toolbar';
import BlockDialog from '../block-dialog';
import PreviewResizeControl from '../preview-resize-control';
import MessageViewer from '../message-viewer';
import ViewerPlaceholder from '../viewer-placeholder';
import ConversationViewer from '../conversation-viewer';
import { withUpdateDraftsById } from '../../graphql-decorators/send-message';
import accountInfo from '../../graphql-decorators/account-info';
import getMailFolders from '../../graphql-decorators/get-mail-folders';
import s from './style.less';
import withCommandHandlers from '../../keyboard-shortcuts/with-command-handlers';
import withMediaQuery from '../../enhancers/with-media-query';
import withEditOutboxMessage from '../../graphql-decorators/send-message/edit-outbox-message';
import MarkAsRead from '../../graphql-decorators/mark-as-read';
import withActionMutation from '../../graphql-decorators/with-action-mutation';
import { updateWhiteBlackList } from '../../graphql-decorators/white-black-list/index.js';
import withTrashMessage from '../../graphql-decorators/trash-message';
import { withCreateContact } from '../../graphql-decorators/contact';
import { USER_FOLDER_IDS } from '../../constants';
import ModalDialog from '../modal-dialog';
import { MAIL_VIEW } from '../../constants/views';
import {
	getMailboxMetadata,
	getArchiveZimletMailboxMetadata,
	withSetMailboxMetaData,
	withSetArchiveMailboxMetaData
} from '../../graphql-decorators/mailbox-metadata';
import withCreateFolderMutation from '../../graphql-decorators/create-folder';
import { getFilteredItemsForLocalFolder } from '../../utils/local-folder';

const { ReadingPaneLocation, ActionOps, ActionType, ActionTypeName } = apiClientTypes;

const AddShortcuts = withCommandHandlers(props => [
	{
		context: 'mail',
		command: 'MARK_AS_READ',
		handler: () => props.handleMarkRead(true)
	},
	{
		context: 'mail',
		command: 'MARK_AS_UNREAD',
		handler: () => props.handleMarkRead(false)
	},
	{
		context: 'mail',
		command: 'DELETE_MESSAGES',
		handler: () => props.handleDeleteMailItem()
	},
	{ context: 'mail', command: 'COMPOSE_MESSAGE', handler: props.handleCompose },
	{
		context: 'mail',
		command: 'OPEN_INBOX',
		handler: () => route(`/${props.slug}/Inbox`)
	},
	{
		context: 'mail',
		command: 'OPEN_DRAFTS',
		handler: () => route(`/${props.slug}/Drafts`)
	},
	{
		context: 'mail',
		command: 'OPEN_JUNK',
		handler: () => route(`/${props.slug}/Junk`)
	},
	{
		context: 'mail',
		command: 'OPEN_SENT',
		handler: () => route(`/${props.slug}/Sent`)
	},
	{
		context: 'mail',
		command: 'OPEN_TRASH',
		handler: () => route(`/${props.slug}/Trash`)
	}
])(() => {});

const BULK_DELETE_PER_PAGE = 1000;

const toolbarEmitter = mitt();

function getToastMsgFor(options) {
	const { op, folderName: folder, address, type, count = 1 } = options;
	return (
		<Text
			id={`actions.toasts.${op}.${type}`}
			plural={count}
			fields={{ count, folder, type: type && upperFirst(type), address }}
		/>
	);
}

/**
 * Returns true for actions that will remove messages from their current message list
 */
function isRemoveFromListActionOperation(op) {
	return !!~[
		ActionOps.spam,
		ActionOps.unspam,
		ActionOps.move,
		ActionOps.trash,
		ActionOps.delete
	].indexOf(op);
}

@configure('routes.slugs, showPrint')
@accountInfo()
@getMailFolders()
@getMailboxMetadata()
@getArchiveZimletMailboxMetadata()
@withSetMailboxMetaData()
@withSetArchiveMailboxMetaData()
@withCreateContact()
@withUpdateDraftsById()
@wire('zimbra', {}, zimbra => ({
	search: zimbra.search
}))
@updateWhiteBlackList()
@connect(
	state => ({
		isAttachmentViewerOpen: getAttachmentPreviewVisibility(state),
		isMediaMenuOpen: get(state, 'mediaMenu.visible'),
		selectedIds: getSelectedIds(state),
		trashFolder: get(state, 'trashFolder.folderInfo'),
		junkFolder: get(state, 'junkFolder.folderInfo'),
		isOffline: state.network.isOffline
	}),
	{
		clearSelected,
		toggleSelected,
		toggleAllSelected,
		openModalCompose,
		notify,
		removeTab
	}
)
@configure('searchInline')
@withEditOutboxMessage()
@withCreateFolderMutation()
@withActionMutation()
@withTrashMessage()
@withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@withText({
	backToTopPlaceholder: 'mail.placeHolders.backtotop',
	searchPlaceHolder: 'mail.placeHolders.search'
})
export default class MailPane extends Component {
	state = {
		blockDialogIsOpen: false,
		blockIsPending: false,
		readingPaneSashHorizontalDragStart: null,
		modifiedReadingPaneSashHorizontal: null,
		readingPaneSashVerticalDragStart: null,
		modifiedReadingPaneSashVertical: null,
		inlineSearchIsVisible: false,
		inlineSearchInputIsVisible: true,
		clicked: false,
		shouldNotBeMarkedAsRead: false
	};

	inputRef = c => {
		this.input = c;
	};

	clearBlockDialog = () => {
		this.setState({
			blockDialogIsOpen: false,
			blockIsPending: false
		});
	};

	deleteAllMailFrom = emails => {
		let totalDeleted = 0;
		this.setState({ blockIsPending: true });

		const searchAndDelete = (offset = 0) =>
			this.props
				.search({
					offset,
					query: `from:(${emails.join(' or ')})`,
					limit: BULK_DELETE_PER_PAGE,
					full: false
				})
				.then(res => {
					totalDeleted += res.messages.length;

					this.props.trashMessage({
						id: res.messages.map(m => m.id).join(',')
					});

					return res.more ? searchAndDelete(offset + BULK_DELETE_PER_PAGE) : res;
				});

		return searchAndDelete()
			.then(() => {
				this.props.afterBulkDelete();

				return {
					message: getToastMsgFor({
						op: 'deleteOnBlockSuccess',
						type: this.props.listType,
						count: totalDeleted,
						address: emails.join(', ')
					})
				};
			})
			.catch(() => {
				this.props.afterBulkDelete();

				return {
					message: getToastMsgFor({
						op: 'deleteOnBlockFail',
						type: this.props.listType,
						address: emails.join(', ')
					})
				};
			});
	};

	blockableEmails = item => {
		if (!this.props.items) {
			return [];
		}

		const { account, items, selectedIds, mailItem } = this.props;
		let senders = [];

		if (selectedIds.size > 0) {
			const idOfSelectedItem = new Set(Array.from(selectedIds).map(e => e.id));
			senders = flatMap(
				items.filter(i => idOfSelectedItem.has(i.id)),
				c => c.emailAddresses
			).filter(a => a.type === 'f');
		} else if (item) {
			senders = getSenders(item);
		} else if (mailItem) {
			senders = getSenders(mailItem);
		}

		return uniq(
			senders
				.filter(Boolean)
				.map(sender => sender.address)
				.filter(e => e !== account.name)
		);
	};

	performAction = (options = {}) => {
		const {
			mailItemId,
			listType,
			selectedIds,
			junkFolder,
			updateDraftsById,
			trashFolder,
			folder
		} = this.props;
		// We should pull out what's not required for Mutation and pass defaultOptions appropriately.
		const {
			isUndo,
			undoAction,
			forceUseId,
			type,
			showNotifications = true,
			...defaultOptions
		} = options;

		const removeFromList = isRemoveFromListActionOperation(options.op) && !isUndo;

		const ids = castArray(
			selectedIds.size > 0 && !forceUseId
				? Array.from(selectedIds).map(e => e.id)
				: defaultOptions.ids || defaultOptions.id || mailItemId
		);

		const actionOptions = {
			...defaultOptions,
			removeFromList,
			id: undefined,
			ids,
			type: type || ActionType[listType],
			junkFolderId: get(junkFolder, 'id')
		};

		if (removeFromList && ids.indexOf(mailItemId) !== -1) {
			this.props.changeActiveMessage(ids);

			// route to parent folder when performing list actions
			route(trimMailFolderViewFromUri(location.pathname));
		}

		const promise = this.props.action(actionOptions);

		const notifyAction = undoAction && {
			action: {
				label: <Text id="buttons.undo" />,
				fn: () => {
					undoAction(ids);
				}
			}
		};

		// PREAPPS-1237: If a message is deleted from outbox save it as a drafts in Trash.
		const outbox = findFolderInCache(this.context.client, { name: 'Outbox' });
		if (outbox && get(folder, 'id') === outbox.id && updateDraftsById) {
			updateDraftsById(ids, {
				folderId: trashFolder.id
			});
		}

		promise.then(() => {
			if (!isUndo && showNotifications) {
				const msgType = type && type === ActionTypeName.MsgAction ? 'message' : listType;
				this.props.notify({
					message: getToastMsgFor({ ...defaultOptions, type: msgType, count: ids.length }),
					...notifyAction
				});
			}
			mailItemId && actionOptions.type !== ActionType[listType] && this.props.onReload();
		});
		this.props.clearSelected();
	};

	handleNext = () => {
		const { mailItem, items, selectMessage, folder, type } = this.props;
		const currentIndex = findIndex(items, ['id', mailItem.id]);
		const lastIndex = items.length - 1;
		const nextId = get(items, `${Math.min(currentIndex + 1, lastIndex)}.id`);
		if (currentIndex === lastIndex) {
			return this.props.notify({
				message: `You have reached the last message in ${folder.name}.`
			});
		}
		this.props.removeTab({ type, id: mailItem.id });
		return selectMessage(nextId);
	};

	handlePrevious = () => {
		const { mailItem, items, selectMessage, folder, type } = this.props;
		const currentIndex = findIndex(items, ['id', mailItem.id]);
		const prevId = get(items, `${Math.max(currentIndex - 1, 0)}.id`);
		if (currentIndex === 0) {
			return this.props.notify({
				message: `You have reached the first message in ${folder.name}.`
			});
		}
		this.props.removeTab({ type, id: mailItem.id });
		return selectMessage(prevId);
	};

	handleMarkRead = (value, id, isUndo, forceUseId, type) =>
		this.performAction({
			id,
			type,
			op: value ? ActionOps.read : ActionOps.unread,
			isUndo,
			forceUseId,
			showNotifications: false
		});

	handleActionBtn = actionFlag => {
		const { mailItem, slugs, listType, mailItemId } = this.props;
		const message =
			listType !== 'message' && get(mailItem, `messages.${mailItem.messages.length - 1}`);
		const isRecurrence = get(message || mailItem, 'invitations.0.components.0.recurrence');
		const methodType = get(message || mailItem, 'invitations.0.components.0.method');
		const invitationId = methodType === 'REQUEST' && (get(message, 'id') || mailItemId);
		const isReadFlag = mailItem && !isUnread(mailItem);
		const recurrenceFlag = isRecurrence ? '/all' : '';
		if (!isReadFlag) this.handleMarkRead(!isReadFlag, mailItem.id);
		invitationId && actionFlag === FORWARD
			? route(`/${slugs.calendar}/event/forward/${invitationId}${recurrenceFlag}`)
			: toolbarEmitter.emit(actionFlag);
	};

	handleArchiveMailItem = (isArchive, id, isUndo) => {
		if (isArchive) {
			let archivedFolder = this.props.archivedFolder;
			if (!archivedFolder) {
				this.props
					.createFolder({
						variables: {
							name: 'Archive',
							view: MAIL_VIEW
						}
					})
					.then(res => {
						archivedFolder = get(res, 'data.createFolder.id');
						this.props.setArchiveZimletMailboxMetadata({
							archivedFolder
						});
						this.props.refetchFolders();
						this.handleMoveMailItem(archivedFolder, 'Archive', isUndo, id);
					})
					.catch(err => {
						console.error(err);
						this.props.notify({
							message: <Text id="notifications.archiveFolderError" />,
							failure: true
						});
					});
				return;
			}
			this.handleMoveMailItem(archivedFolder, 'Archive', isUndo, id);
			return;
		}
		this.handleMoveMailItem(USER_FOLDER_IDS.INBOX, 'Inbox', isUndo, id);
	};

	handleSpamMailItem = (value, id, isUndo, folderId) =>
		this.performAction({
			id,
			op: value ? ActionOps.spam : ActionOps.unspam,
			isUndo,
			folderId,
			undoAction: ids => {
				this.handleSpamMailItem(!value, ids, true, get(this, 'props.folder.id'));
			}
		});

	handleShowOriginal = messageId => {
		const id = !messageId || typeof messageId === 'object' ? get(this, 'props.item.id') : messageId;
		const href = this.context.zimbraBatchClient.resolve(
			`/service/home/~/?id=${id.replace('-', '')}`
		);
		const showOriginalWindow = window.open(href, 'showOriginalMimeWindow', 'height=400,width=650');
		showOriginalWindow.focus();
	};

	handleFlag = (value, id, isUndo, forceUseId, type) => {
		const { folder } = this.props;
		folder.name !== 'Outbox' &&
			this.performAction({
				id,
				type,
				op: value ? ActionOps.flag : ActionOps.unflag,
				isUndo,
				forceUseId,
				showNotifications: false
			});
	};

	moveItemsFromLocalFolder = (currentFolderName, destFolderId, destFolderName) => {
		const { uploadEmails, selectedIds, mailItem } = this.props;
		const msgsToUpload = selectedIds.size > 0 ? Array.from(selectedIds) : [mailItem];
		const msgIdsToUpload = msgsToUpload.map(m => m.id);

		msgIdsToUpload.length &&
			uploadEmails(msgIdsToUpload, currentFolderName, destFolderId, destFolderName);

		this.props.clearSelected();
	};

	moveItemsToLocalFolder = destFolderName => {
		const { downloadEmails, selectedIds, listType, mailItem, notify: notifyAction } = this.props;
		const {
			msgIdsToDownload,
			msgIdsToBeDeletedFromSource,
			convIdsToBeDeletedFromSource
		} = getFilteredItemsForLocalFolder(
			selectedIds.size > 0
				? Array.from(selectedIds)
				: listType === 'conversation'
				? [
						{
							...mailItem,
							messagesMetaData: mailItem.messages // This logic will be removed once we get rid of `messagesMetaData`
						}
				  ]
				: [mailItem],
			listType
		);

		msgIdsToDownload &&
			downloadEmails(msgIdsToDownload, destFolderName).then(() => {
				const mailItemsDeletePromises = [
					convIdsToBeDeletedFromSource &&
						this.performAction({
							op: ActionOps.delete,
							ids: convIdsToBeDeletedFromSource,
							type: ActionType.conversation,
							showNotifications: false,
							forceUseId: true
						}),
					msgIdsToBeDeletedFromSource &&
						this.performAction({
							op: ActionOps.delete,
							ids: msgIdsToBeDeletedFromSource,
							type: ActionType.message,
							folderName: destFolderName,
							showNotifications: false,
							forceUseId: true
						})
				];

				Promise.all(mailItemsDeletePromises).then(() => {
					notifyAction({
						message: (
							<Text
								id="local_folder.movedSuccessfuly"
								plural={msgIdsToDownload.length}
								fields={{ folder: destFolderName, count: msgIdsToDownload.length }}
							/>
						)
					});
				});
			});
	};

	handleMoveMailItem = (destFolderId, destFolderName, isUndo, id, type) => {
		const currentFolderId = get(this.props, 'folder.id');
		const currentFolderName = get(this.props, 'folder.name');

		if (this.props.localFolder) {
			this.moveItemsFromLocalFolder(currentFolderName, destFolderId, destFolderName);
		} else if (destFolderId === 'isLocalFolder') {
			this.moveItemsToLocalFolder(destFolderName);
		} else if (destFolderId !== currentFolderId || isUndo) {
			this.performAction({
				op: ActionOps.move,
				id,
				type,
				folderId: destFolderId,
				folderName: destFolderName,
				constraints: '-d', // not in Drafts
				isUndo,
				undoAction: ids => {
					this.handleMoveMailItem(currentFolderId, currentFolderName, true, ids, type);
				}
			});
		}
	};

	handleDeleteMailItem = (id, forceUseId, itemFolderId, type) => {
		const folderId = type ? itemFolderId : get(this, 'props.folder.id');

		if (
			this.isInTrashFolder(folderId) ||
			this.isInTrashSubFolder(this.props.folder) ||
			this.isInJunkFolder(folderId) ||
			this.isInJunkSubFolder(this.props.folder)
		) {
			return this.showConfirmPermanentDelete(id, forceUseId, type);
		}

		this.performAction({
			id,
			type,
			op: ActionOps.trash,
			forceUseId,
			undoAction: ids => {
				this.performAction({
					op: ActionOps.move,
					ids,
					folderId,
					isUndo: true,
					type
				});
			}
		});
	};

	handleEditOutboxMessage = () => {
		this.props.editOutboxMessage(this.props.mailItem);
	};

	showConfirmPermanentDelete = (id, forceUseId, type) => {
		this.setState({
			showPermDelete: true,
			permDeleteOptions: {
				id,
				type,
				forceUseId
			}
		});
	};

	handleConfirmPermanentDelete = () => {
		const { id, forceUseId, type } = this.state.permDeleteOptions;
		this.setState({ showPermDelete: false, permDeleteOptions: null });

		this.performAction({
			type,
			id,
			op: ActionOps.delete,
			constraints: 'tjo',
			forceUseId
		});
	};

	handleCancelPermanentDelete = () => {
		this.setState({
			showPermDelete: false,
			permDeleteOptions: null
		});
	};

	handleAddSenderToContacts = (sender, mailItemType) => {
		this.props.createContact(sender).then(() => {
			this.props.notify({
				message: getToastMsgFor({
					op: 'addSenderToContacts',
					address: get(sender, 'attributes.email', ''),
					type: mailItemType
				})
			});
		});
	};

	handleCheckboxSelect = (item, e) => {
		this.props.toggleSelected({ item, e });
		this.props.toggleLocalFolderForMove();
	};

	handleToggleSelectAll = () => {
		this.props.toggleAllSelected({ items: this.props.items });
		this.props.toggleLocalFolderForMove();
	};

	handleToggleBlockDialog = () => {
		this.setState({
			blockableEmails: null,
			blockDialogIsOpen: !this.state.blockDialogIsOpen
		});
	};

	handleRightClickBlock = item => {
		this.setState({
			blockableEmails: this.blockableEmails(item),
			blockDialogIsOpen: !this.state.blockDialogIsOpen
		});
	};

	handleAddToBlackList = ({ emails, blockAll, deleteAll }) => {
		if (emails.length === 0) {
			this.setState({ blockDialogIsOpen: false });
			return;
		}

		const promises = [];
		this.setState({ blockIsPending: true });

		if (deleteAll) {
			promises.push(
				this.deleteAllMailFrom(emails).then(({ message }) => {
					if (!blockAll) {
						this.props.notify({ message });
					}
				})
			);
		}

		if (blockAll) {
			promises.push(
				this.props.updateBlackList(emails, '+').then(() => {
					const { listType } = this.props,
						op = deleteAll ? 'deleteAndBlock' : 'block';

					this.props.notify({
						message: getToastMsgFor({
							op,
							address: emails.join(', '),
							type: listType,
							count: emails.length
						})
					});
				})
			);
		}

		Promise.all(promises)
			.then(() => {
				this.clearBlockDialog();
				this.props.clearSelected();
			})
			.catch(() => {
				this.clearBlockDialog();
			});
	};

	handlePreviewResizeStart = (start, horizontalResizer) => {
		const previewResizeStartSettings = {};

		if (horizontalResizer) {
			previewResizeStartSettings.readingPaneSashVerticalDragStart =
				this.state.modifiedReadingPaneSashVertical ||
				this.props.mailboxMetadata.zimbraPrefReadingPaneSashVertical ||
				ReadingPaneSashVerticalDefault;
		} else {
			previewResizeStartSettings.readingPaneSashHorizontalDragStart =
				this.state.modifiedReadingPaneSashHorizontal ||
				this.props.mailboxMetadata.zimbraPrefReadingPaneSashHorizontal ||
				ReadingPaneSashHorizontalDefault;
		}

		this.setState(previewResizeStartSettings);
	};

	handlePreviewResize = (offset, horizontalResizer) => {
		const previewResizeSettings = {};

		/**
		 * We check if the dragged value is within MailListPaneMinShrinkThreshold and MailListPaneMaxGrowthThreshold range.
		 * If yes, update the respective state's data with current dragged value.
		 * Otherwise, stick to the value that was last set.
		 */
		if (horizontalResizer) {
			const updatedReadingPaneSashVertical =
				this.state.readingPaneSashVerticalDragStart + (offset / this.base.offsetWidth) * 100;

			previewResizeSettings.modifiedReadingPaneSashVertical =
				updatedReadingPaneSashVertical >= MailListPaneMinShrinkThreshold &&
				updatedReadingPaneSashVertical <= MailListPaneMaxGrowthThreshold
					? updatedReadingPaneSashVertical
					: this.state.modifiedReadingPaneSashVertical;
		} else {
			const updatedReadingPaneSashHorizontal =
				this.state.readingPaneSashHorizontalDragStart + (offset / this.base.offsetHeight) * 100;

			previewResizeSettings.modifiedReadingPaneSashHorizontal =
				updatedReadingPaneSashHorizontal >= MailListPaneMinShrinkThreshold &&
				updatedReadingPaneSashHorizontal <= MailListPaneMaxGrowthThreshold
					? updatedReadingPaneSashHorizontal
					: this.state.modifiedReadingPaneSashHorizontal;
		}

		this.setState(previewResizeSettings);
	};

	handlePreviewResizeEnd = (offset, horizontalResizer) => {
		const previewResizeEndSettings = {};

		if (horizontalResizer) {
			previewResizeEndSettings.zimbraPrefReadingPaneSashVertical = Math.round(
				this.state.modifiedReadingPaneSashVertical
			);
		} else {
			previewResizeEndSettings.zimbraPrefReadingPaneSashHorizontal = Math.round(
				this.state.modifiedReadingPaneSashHorizontal
			);
		}

		this.props.setMailboxMetadata(previewResizeEndSettings);
	};

	handleCompose = () => {
		this.props.openModalCompose({ message: newMessageDraft() });
		route(`/${this.props.slugs.email}/new`);
	};

	handleSearchForContact = mailItem => {
		const sender = first(
			mailItem.emailAddresses.filter(withoutAccountAddresses(this.props.account))
		);

		if (sender) {
			route(`/search/${this.props.slugs.email}?e=${encodeURIComponent(sender.address)}`);
		}
	};

	setClicked = () => {
		this.setState({ ...this.state, clicked: !this.state.clicked });
	};

	isInTrashFolder = folderId =>
		folderId === USER_FOLDER_IDS.TRASH.toString() || folderId === this.props.trashFolder.id;

	isInTrashSubFolder = folder =>
		folder && folder.absFolderPath && folder.absFolderPath.match(/(^\/Trash\/)/);

	isInJunkFolder = folderId =>
		folderId === USER_FOLDER_IDS.JUNK.toString() || folderId === this.props.junkFolder.id;

	isInJunkSubFolder = folder =>
		folder && folder.absFolderPath && folder.absFolderPath.match(/(^\/Junk\/)/);

	handleSubmit = e => {
		const text = this.input.value;
		if (e.keyCode === KeyCodes.CARRIAGE_RETURN) {
			route(
				`/search/email?${queryString.stringify({
					q: text || undefined,
					type: 'conversation',
					folder: 'All'
				})}`
			);
		}
	};

	toggleInlineSearchVisibility = isVisible =>
		this.setState({ inlineSearchInputIsVisible: isVisible });

	expandButton = () => {
		this.input.focus();
		this.setState({ inlineSearchIsVisible: !this.state.inlineSearchIsVisible });
	};

	shouldNotBeMarkedRead = () => {
		this.setState({ shouldNotBeMarkedAsRead: true });
	};

	handleReadReceiptNotification = (id, showNotification) => {
		this.props
			.action({
				id,
				type: ActionType.message,
				op: ActionOps.update,
				flags: 'n'
			})
			.then(() => {
				showNotification &&
					this.props.notify({
						message: <Text id="requestReadReceipt.notifyReceiptSent" />
					});
			});
	};

	static defaultProps = {
		items: [],
		mailItem: null,
		folder: null,
		pending: false,
		more: false,
		headerClass: null,
		renderNoItems: () => {},
		changeActiveMessage: () => {},
		afterBulkDelete: () => {},
		onScroll: () => {},
		onItemClick: () => {},
		onReload: () => {}
	};

	componentWillMount() {
		this.props.clearSelected();
	}

	componentWillReceiveProps(nextProps) {
		const { mailItem, folder, mailItemId } = nextProps;
		const { mailItem: prevMailItem, folder: prevFolder, mailItemId: prevmailItemId } = this.props;

		((!mailItemId && !prevmailItemId) || mailItemId !== prevmailItemId) &&
			this.setState({ shouldNotBeMarkedAsRead: false });

		// Whenever the active mail item or the active folder changes, clear selection.
		if (
			get(mailItem, 'id') !== get(prevMailItem, 'id') ||
			get(folder, 'name') !== get(prevFolder, 'name')
		) {
			this.props.clearSelected();
		}
	}

	renderMailActions = (toolbarProps = {}) => {
		const {
			folder,
			mailItem,
			type,
			onCloseMessage,
			isAttachmentViewerOpen,
			isMediaMenuOpen,
			selectedIds,
			isOffline,
			onPrint,
			showPrint,
			mailItemId,
			flagOfCurrentMessage,
			localFolder,
			disableLocalFolderForMove
		} = this.props;
		const disableBlock = (this.blockableEmails() || []).length === 0;

		return (
			<MailActions
				isOffline={isOffline}
				isAttachmentViewerOpen={isAttachmentViewerOpen}
				isMediaMenuOpen={isMediaMenuOpen}
				multiple={selectedIds.size > 0}
				singleMailItem={mailItem}
				singleMailItemType={type}
				currentFolder={folder}
				disabled={!mailItem && selectedIds.size === 0}
				onArchive={
					get(folder, 'id') !== String(USER_FOLDER_IDS.DRAFTS) && this.handleArchiveMailItem
				}
				onBlock={!disableBlock && this.handleToggleBlockDialog}
				onDelete={this.handleDeleteMailItem}
				onEdit={this.handleEditOutboxMessage}
				onSpam={this.handleSpamMailItem}
				onShowOriginal={this.handleShowOriginal}
				onMarkRead={this.handleMarkRead}
				onFlag={this.handleFlag}
				onMove={this.handleMoveMailItem}
				onReply={callWith(this.handleActionBtn, REPLY)}
				onReplyAll={callWith(this.handleActionBtn, REPLY_ALL)}
				onForward={callWith(this.handleActionBtn, FORWARD)}
				onPrint={showPrint && callWith(onPrint, mailItemId)}
				handleNext={this.handleNext}
				handlePrevious={this.handlePrevious}
				handleClose={onCloseMessage}
				flagOfCurrentMessage={flagOfCurrentMessage}
				selectedIds={selectedIds}
				localFolder={localFolder}
				disableLocalFolderForMove={disableLocalFolderForMove}
				{...toolbarProps}
			/>
		);
	};

	render(
		{
			type,
			listType,
			account,
			items,
			folder,
			pending,
			more,
			sortBy,
			headerClass,
			mailItem,
			mailItemId,
			onSend,
			onSort,
			onDeleteDraft,
			onSaveDraft,
			onCancelDraft,
			onItemClick,
			onItemDblClick,
			onPrint,
			disableList,
			disablePreview: disablePreviewProp,
			disableMessageNavigation,
			wide: wideProp,
			showFolderName,
			showSnippets,
			isAttachmentViewerOpen,
			isMediaMenuOpen,
			selectedIds,
			slugs,
			matchesScreenSm,
			matchesScreenMd,
			archivedFolder,
			mailboxMetadata,
			searchScreen,
			openSearchBar,
			searchInline,
			renderMailActions,
			toggleAllowedFolders,
			isOffline,
			prevLocation,
			flagOfCurrentMessage,
			localFolder,
			renderOfflineMessage,
			replyLocalFolder,
			disableLocalFolderForMove,
			...rest
		},
		{
			blockIsPending,
			blockDialogIsOpen,
			modifiedReadingPaneSashHorizontal,
			modifiedReadingPaneSashVertical,
			inlineSearchIsVisible,
			inlineSearchInputIsVisible,
			clicked,
			permDeleteOptions,
			showPermDelete,
			shouldNotBeMarkedAsRead
		}
	) {
		const readingPaneLocation = account.prefs.zimbraPrefReadingPaneLocation;
		const {
			zimbraPrefReadingPaneSashHorizontal,
			zimbraPrefReadingPaneSashVertical
		} = mailboxMetadata;
		const blockableEmails = this.blockableEmails();
		const disablePreview = disablePreviewProp || readingPaneLocation === ReadingPaneLocation.Off;
		const previewEnabled = !disablePreview && !disableList;
		const rightPreviewEnabled =
			previewEnabled &&
			// right preview is enabled on landscape tablet
			((readingPaneLocation === ReadingPaneLocation.Right && matchesScreenSm) ||
				// override bottom preview to display as right preview on landscape tablet
				(readingPaneLocation === ReadingPaneLocation.Bottom &&
					!matchesScreenMd &&
					matchesScreenSm));
		const bottomPreviewEnabled =
			previewEnabled && matchesScreenMd && readingPaneLocation === ReadingPaneLocation.Bottom;
		const wide = wideProp || (!rightPreviewEnabled && matchesScreenSm);

		const listHeight =
			modifiedReadingPaneSashHorizontal ||
			parseInt(zimbraPrefReadingPaneSashHorizontal, 10) ||
			ReadingPaneSashHorizontalDefault;
		const listWidth =
			modifiedReadingPaneSashVertical ||
			parseInt(zimbraPrefReadingPaneSashVertical, 10) ||
			ReadingPaneSashVerticalDefault;
		const showList = !disableList && ((previewEnabled && matchesScreenSm) || !mailItemId);

		const isTrashSubFolder = folder && this.isInTrashSubFolder(folder);

		let conversationItem;

		if (folder && mailItem && listType === conversationType) {
			const messageList =
				this.isInTrashFolder(folder.id) || this.isInTrashSubFolder(folder)
					? mailItem.messages
					: mailItem.messages.filter(m => !this.isInTrashFolder(m.folderId));
			conversationItem = { ...mailItem, messages: messageList };
		}

		return (
			<div
				class={cx(
					s.mailPane,
					rest.class,
					isAttachmentViewerOpen && s.attachmentViewerOpen,
					isMediaMenuOpen && s.mediaMenuOpen
				)}
			>
				<AddShortcuts
					slug={slugs.email}
					handleMarkRead={this.handleMarkRead}
					handleDeleteMailItem={this.handleDeleteMailItem}
					handleCompose={this.handleCompose}
				/>
				{showPermDelete && (
					<ModalDialog
						title={`dialogs.permanentDelete.${permDeleteOptions.type ? 'message' : listType}.title`}
						onClose={this.handleCancelPermanentDelete}
						onAction={this.handleConfirmPermanentDelete}
					>
						<Text
							id={`dialogs.permanentDelete.${
								permDeleteOptions.type ? 'message' : listType
							}.description`}
						/>
					</ModalDialog>
				)}
				{showList && (
					<div
						class={cx(
							s.mailListPane,
							rightPreviewEnabled && s.narrow,
							bottomPreviewEnabled && s.withBottomPreview,
							isAttachmentViewerOpen && s.collapse,
							searchInline && s.tabSearchHeader
						)}
						style={
							bottomPreviewEnabled
								? { height: `${listHeight}%` }
								: rightPreviewEnabled
								? { width: `${listWidth}%` }
								: {}
						}
					>
						{!inlineSearchInputIsVisible && (
							<div class={cx(s.hideMdDown, s.scrollParent)}>
								<button
									title={this.backToTopPlaceholder}
									class={s.scrollToTop}
									onClick={this.setClicked}
								>
									<Icon size="md" name="arrow-up" />
								</button>
								<div
									class={cx(s.searchContainer, inlineSearchIsVisible && s.inlineSearchIsVisible)}
								>
									<button class={s.searchButton} type="submit" onClick={this.expandButton}>
										<Icon size="md" name="search" />
									</button>
									<input
										class={s.input}
										type="search"
										placeholder={this.searchPlaceHolder}
										ref={this.inputRef}
										onKeydown={this.handleSubmit}
									/>
								</div>
							</div>
						)}

						<MailListHeader
							class={cx((wide || renderMailActions) && headerClass)}
							currentFolder={folder}
							selected={selectedIds}
							searchScreen={searchScreen}
							allSelected={
								!pending && items && items.length > 0 && selectedIds.size === items.length
							}
							onToggleSelectAll={this.handleToggleSelectAll}
							onSort={onSort}
							sortBy={sortBy}
							wide={wide || renderMailActions}
							localFolder={localFolder}
						>
							{(wide || renderMailActions) &&
								this.renderMailActions({
									wide,
									hideReplyActions: disablePreview,
									hideMessageNavigation: previewEnabled || showList || disableMessageNavigation
								})}
						</MailListHeader>

						{items && items.length > 0 ? (
							<MailList
								type={listType}
								account={account}
								items={{
									more,
									pending,
									data: items
								}}
								folderName={get(folder, 'name')}
								handleItemCheckboxSelect={this.handleCheckboxSelect}
								handleItemClick={onItemClick}
								handleItemDblClick={onItemDblClick}
								onDelete={this.handleDeleteMailItem}
								onShowOriginal={this.handleShowOriginal}
								onScroll={this.props.onScroll}
								onMarkRead={this.handleMarkRead}
								onSpam={this.handleSpamMailItem}
								onArchive={this.handleArchiveMailItem}
								onBlock={this.handleRightClickBlock}
								onPrint={callWith(
									onPrint,
									type === conversationType && mailItemId ? mailItemId : null
								)}
								onAddToContacts={this.handleAddSenderToContacts}
								clicked={clicked}
								setClicked={this.setClicked}
								toggleInlineSearchVisibility={this.toggleInlineSearchVisibility}
								onFlag={this.handleFlag}
								onSearch={this.handleSearchForContact}
								selectedIds={selectedIds}
								viewingId={mailItemId}
								sortBy={sortBy}
								wide={wide}
								showFolderName={showFolderName}
								showSnippets={showSnippets}
								shouldNotBeMarkedRead={this.shouldNotBeMarkedRead}
								toggleAllowedFolders={toggleAllowedFolders}
								prevLocation={prevLocation}
								localFolder={localFolder}
								isOffline={isOffline}
								renderOfflineMessage={renderOfflineMessage}
							/>
						) : pending ? (
							<MailLoadingFooter />
						) : (
							this.props.renderNoItems(this.props)
						)}
					</div>
				)}

				{(bottomPreviewEnabled || rightPreviewEnabled) && (
					<PreviewResizeControl
						onDragStart={this.handlePreviewResizeStart}
						onDrag={this.handlePreviewResize}
						onDragEnd={this.handlePreviewResizeEnd}
						horizontalResizer={rightPreviewEnabled}
					/>
				)}

				{(mailItemId || (previewEnabled && matchesScreenSm)) && (
					<div
						class={cx(
							s.readPane,
							bottomPreviewEnabled && s.readPaneWide,
							isAttachmentViewerOpen && s.rightPaneOpen
						)}
						style={
							bottomPreviewEnabled && !isAttachmentViewerOpen
								? { height: `${100 - listHeight}%` }
								: {}
						}
					>
						{(!bottomPreviewEnabled || isAttachmentViewerOpen) &&
							matchesScreenSm &&
							this.renderMailActions({
								hideMessageNavigation:
									(previewEnabled && showList) || showList || disableMessageNavigation
							})}

						{selectedIds.size > 0 || !mailItem ? (
							<ViewerPlaceholder
								mailItem={mailItem}
								mailItemId={mailItemId}
								numSelected={selectedIds.size}
							/>
						) : (
							<MarkAsRead
								type={type}
								item={mailItem}
								shouldNotBeMarkedAsRead={shouldNotBeMarkedAsRead}
							>
								{listType === conversationType ? (
									<ConversationViewer
										events={toolbarEmitter}
										conversation={conversationItem || mailItem}
										onCompose={this.handleCompose}
										onDeleteDraft={onDeleteDraft}
										onSaveDraft={onSaveDraft}
										onCancelDraft={onCancelDraft}
										onShowOriginal={this.handleShowOriginal}
										onDeleteMailItem={this.handleDeleteMailItem}
										onEdit={this.handleEditOutboxMessage}
										onSend={onSend}
										wide={!showList}
										matchesScreenSm={matchesScreenSm}
										matchesScreenMd={matchesScreenMd}
										srcFolder={folder}
										onMarkRead={this.handleMarkRead}
										onFlag={this.handleFlag}
										onBlock={this.handleRightClickBlock}
										onDelete={this.handleDeleteMailItem}
										print={callWith(onPrint, mailItemId)}
										isTrashSubFolder={isTrashSubFolder}
										onDeliveringReadReceipt={this.handleReadReceiptNotification}
									/>
								) : (
									mailItem && (
										<MessageViewer
											events={toolbarEmitter}
											message={mailItem}
											messageFull={mailItem}
											onFlag={this.handleFlag}
											onMarkRead={this.handleMarkRead}
											onDeleteDraft={onDeleteDraft}
											onDeleteMailItem={this.handleDeleteMailItem}
											onEdit={this.handleEditOutboxMessage}
											onSaveDraft={onSaveDraft}
											onCancelDraft={onCancelDraft}
											onShowOriginal={this.handleShowOriginal}
											onSend={onSend}
											wide={!showList}
											srcFolder={folder}
											onBlock={this.handleRightClickBlock}
											onDelete={this.handleDeleteMailItem}
											print={callWith(onPrint, mailItemId)}
											isTrashSubFolder={isTrashSubFolder}
											localFolder={localFolder}
											replyLocalFolder={replyLocalFolder}
											onDeliveringReadReceipt={this.handleReadReceiptNotification}
										/>
									)
								)}
							</MarkAsRead>
						)}
					</div>
				)}

				{blockDialogIsOpen && (
					<BlockDialog
						emails={this.state.blockableEmails || blockableEmails}
						pending={blockIsPending}
						onConfirm={this.handleAddToBlackList}
						onClose={this.handleToggleBlockDialog}
					/>
				)}
				<MailToolbar
					hideContextActions={matchesScreenSm || (!mailItem && selectedIds.size === 0)}
					hideBackButton={!mailItemId}
					isAttachmentViewerOpen={isAttachmentViewerOpen}
					currentFolder={folder}
					singleMailItem={mailItem}
					disabled={!mailItem && selectedIds.size === 0}
					multiple={selectedIds.size > 0}
					onCompose={this.handleCompose}
					onSpam={this.handleSpamMailItem}
					archivedFolder={archivedFolder}
					onArchive={this.handleArchiveMailItem}
					onBlock={this.handleToggleBlockDialog}
					onDelete={this.handleDeleteMailItem}
					onEdit={this.handleEditOutboxMessage}
					onMarkRead={this.handleMarkRead}
					onFlag={this.handleFlag}
					onMove={this.handleMoveMailItem}
					account={account}
					flagOfCurrentMessage={flagOfCurrentMessage}
					selectedIds={selectedIds}
					openSearchBar={openSearchBar}
					isOffline={isOffline}
					disableLocalFolderForMove={disableLocalFolderForMove}
				/>
			</div>
		);
	}
}
