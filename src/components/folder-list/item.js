import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import { graphql } from 'react-apollo';
import get from 'lodash-es/get';
import each from 'lodash-es/each';
import { getCurrentUrl, route } from 'preact-router';
import { compose } from 'recompose';
import cx from 'classnames';
import queryString from 'query-string';
import linkstate from 'linkstate';
import { USER_FOLDER_IDS } from '../../constants';
import { isActiveFolder, isActiveOrChildFolder, routeToRenamedFolder } from '../../utils/routing';
import { canMoveMessagesIntoFolders, specialFolders, isRenameAllowed } from '../../utils/folders';
import { callWith, isValidEmail } from '../../lib/util';
import { configure } from '../../config';
import withDialog from '../../enhancers/with-dialog';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenSmMax } from '../../constants/breakpoints';
import { Icon } from '@zimbra/blocks';
import MenuItem from '../menu-item';
import CollapsibleControl from '../collapsible-control';
import FolderInput from '../folder-input';
import NakedButton from '../naked-button';
import ContextMenu from '../context-menu';
import EmptyFolderDialog from '../empty-folder-dialog';
import DeleteList from '../contacts/edit-lists/delete-list';
import DeleteFolderDialog from '../delete-folder-dialog';
import {
	InboxContextMenu,
	SpecialFolderContextMenu,
	SpamContextMenu,
	TrashContextMenu,
	ContactListContextMenu,
	DefaultFolderContextMenu
} from '../context-menus';
import { DEFAULT_NOTIFICATION_DURATION } from '../../constants/notifications';
import {
	MovedSmartFolderMessage,
	DeletedSmartFolder
} from '../../components/notifications/messages';
import { OnlyEmptyFoldersDeletedMessage } from '../notifications/messages';
import { notify } from '../../store/notifications/actions';
import { setShowAdvanced } from '../../store/navigation/actions';
import { setActiveSearch } from '../../store/search/actions';
import { hide } from '../../store/sidebar/actions';
import ActionMutation from '../../graphql/queries/action.graphql';
import { withModifyContactList } from '../../graphql-decorators/contact/create-modify-list';

import style from './style';
import { getQueryOptions } from '../../utils/search';
import NewFolder from './new-folder';
import {
	getFolderNameValidationStatus,
	INVALID_FOLDER_NAME_ERRORS,
	FOLDER_NAME_CHAR_LIMIT
} from './util';
import localFolderHandler from '@zimbra/electron-app/src/local-folder';
import { faultCode } from '../../utils/errors';

const DROP_ANIMATION_MAX = 500;
const CUSTOM_CONTEXT_MENUS = {
	'message.inbox': { contextMenu: InboxContextMenu, showEllipsis: false },
	'message.drafts': { contextMenu: SpecialFolderContextMenu, showEllipsis: false },
	'message.sent': { contextMenu: SpecialFolderContextMenu, showEllipsis: false },
	'message.archive': { contextMenu: SpecialFolderContextMenu, showEllipsis: false },
	'message.junk': { contextMenu: SpamContextMenu, showEllipsis: false },
	'message.trash': { contextMenu: TrashContextMenu, showEllipsis: false },
	'message.outbox': { contextMenu: SpecialFolderContextMenu, showEllipsis: false },
	contactgroup: { contextMenu: ContactListContextMenu, showEllipsis: true },
	message: { contextMenu: DefaultFolderContextMenu, showEllipsis: true }
};

class BaseFolderListItem extends Component {
	state = {
		dropTarget: false,
		dropped: false,
		isRenaming: false,
		isCreatingSubFolder: false
	};

	customContextMenu = () => {
		const { customContextMenus = {}, folder, view } = this.props;
		const contextMenuKey = `${view}.${folder.name}`.toLowerCase();
		const contextMenuListKey = view.toLowerCase();
		const contextMenuObject =
			customContextMenus[contextMenuKey] ||
			CUSTOM_CONTEXT_MENUS[contextMenuKey] ||
			CUSTOM_CONTEXT_MENUS[contextMenuListKey];
		if (contextMenuObject) {
			return contextMenuObject.contextMenu;
		}
		return null;
	};

	validateFolderName = (name, isLocalFolder) => {
		const { isValid, notifyMessageID } = getFolderNameValidationStatus(name, isLocalFolder);

		if (!isValid) {
			const message =
				notifyMessageID !== INVALID_FOLDER_NAME_ERRORS.LENGTH_EXCEED_WARNING ? (
					<Text id={`notifications.${notifyMessageID}`} />
				) : (
					<Text
						id={`notifications.${notifyMessageID}`}
						fields={{ count: FOLDER_NAME_CHAR_LIMIT }}
					/>
				);

			this.props.notify({
				failure: true,
				message
			});
		}
		return isValid;
	};

	showMenuEllipsis = () => {
		const { customContextMenus = {}, folder, view } = this.props;
		const contextMenuKey = `${view}.${folder.name}`.toLowerCase();
		const contextMenuListKey = view.toLowerCase();
		const contextMenuObject =
			customContextMenus[contextMenuKey] ||
			CUSTOM_CONTEXT_MENUS[contextMenuKey] ||
			CUSTOM_CONTEXT_MENUS[contextMenuListKey];
		if (contextMenuObject) return contextMenuObject.showEllipsis;
		return null;
	};

	getSearchURL = folderQuery => {
		const { urlSlug, folder } = this.props;
		const fQuery = getQueryOptions(folderQuery);
		const qObject = {};
		each(fQuery, (value, key) => {
			if (value && key !== 'query') {
				if (key === 'dateTypeValue') {
					if (value !== 'anytime') {
						qObject[key] = value;
					}
				} else if (key === 'activeFolder') {
					qObject.folder = value;
				} else {
					qObject[key] = value;
				}
			}
		});

		const types = urlSlug === 'calendar' ? 'appointment,task' : 'conversation';
		const searchParam =
			isValidEmail(fQuery.query) && !Object.keys(qObject).length
				? { e: fQuery.query, types }
				: { q: fQuery.query, types, ...qObject };

		return `/search/${urlSlug}/?${queryString.stringify(searchParam)}&foldername=${folder.name}`;
	};

	handleDrop = e => {
		e.preventDefault();
		const { dropTargetType, onDrop, folder } = this.props;
		e.targetFolder = e.targetList = e.destination = folder;
		e.targetType = e.destinationType = dropTargetType || 'folder';
		if (onDrop != null) onDrop(e, folder);
		this.setState({ dropped: true });
		setTimeout(this.handleDragLeave, DROP_ANIMATION_MAX);
		return false;
	};

	handleDragOver = e => {
		e.preventDefault();
		const { onDrop, dropEffect } = this.props;
		e.dataTransfer.dropEffect = dropEffect;
		if (onDrop != null) {
			this.setState({ dropTarget: true, dropped: false });
		}
	};

	handleDragLeave = () => {
		if (this.props.onDrop != null) {
			this.setState({ dropTarget: false, dropped: false });
		}
	};

	handleMarkRead = () =>
		this.props.action({
			variables: {
				type: 'FolderAction',
				op: 'read',
				id: this.props.folder.id
			}
		});

	handleDelete = () => {
		const { folder, view, confirmDelete, notify: notifyAction, confirmDeleteList } = this.props;

		if (folder.isLocalFolder) {
			const {
				account,
				localStorePath,
				folder: { name }
			} = this.props;
			localFolderHandler({
				operation: 'get-msg-count',
				folderPath: localStorePath,
				accountName: account.name,
				name
			}).then(mailcount => {
				if (mailcount > 0) {
					notifyAction({
						message: <OnlyEmptyFoldersDeletedMessage name={folder.name} />
					});
				} else {
					confirmDelete();
				}
			});
		} else if (folder.unread > 0) {
			notifyAction({
				message: <OnlyEmptyFoldersDeletedMessage name={folder.name} />
			});
		} else if (view === 'contactGroup') {
			confirmDeleteList();
		} else {
			confirmDelete();
		}
	};

	handleRename = () => {
		this.setState({
			isRenaming: true,
			renamingInputValue: this.props.folder && this.props.folder.name
		});
	};

	handleCloseRename = () => {
		this.setState({ isRenaming: false, renamingInputValue: undefined });
	};

	handleRenameSubmit = name => {
		const {
			folder,
			isSearchFolder,
			action,
			notify: notifyAction,
			view,
			modifyContactList
		} = this.props;

		if (!this.validateFolderName(name)) {
			return;
		}

		if (view === 'contactGroup') {
			modifyContactList({
				groupName: name,
				folderId: folder.folderId,
				groupId: folder.id
			}).then(() => {
				this.performRenameSubmitAfterAction(name);
			});
		} else {
			const newName = name.replace(/^[ ]+|[ ]+$/g, '');

			action({
				variables: {
					name: newName,
					type: 'FolderAction',
					op: 'rename',
					id: folder.id
				}
			})
				.then(() => {
					this.performRenameSubmitAfterAction(name);
				})
				.catch(err => {
					const errCode = faultCode(err);

					if (errCode && errCode === 'mail.ALREADY_EXISTS') {
						notifyAction({
							failure: true,
							message: (
								<Text
									id={`faults.${errCode}${isSearchFolder ? '_search' : '_folder'}`}
									fields={{ name: newName }}
								/>
							)
						});
					}
				});
		}

		this.setState({ isRenaming: false });
	};

	performRenameSubmitAfterAction = listName => {
		const { folder, afterAction } = this.props;

		afterAction && afterAction();

		const url = getCurrentUrl();

		if (isActiveOrChildFolder(folder, url)) {
			routeToRenamedFolder(folder, url, listName);
		}
	};

	handleEditSearch = () => {
		const { matchesMediaQuery, folder } = this.props;
		!matchesMediaQuery && this.props.hide();
		this.props.setActiveSearch(folder);
		this.props.setShowAdvanced({ show: true });
	};

	handleCreateSubFolder = () => {
		this.setState({ isCreatingSubFolder: true });
	};

	handleCreateSubFolderClose = () => {
		this.setState({ isCreatingSubFolder: false });
	};

	handleCreateSubFolderSubmit = name => {
		const {
			view,
			folder: { id: parentFolderId },
			createFolder,
			onToggleExpanded
		} = this.props;

		if (!this.validateFolderName(name)) {
			return;
		}

		createFolder({
			name,
			view,
			parentFolderId
		});

		this.setState({ isCreatingSubFolder: false });
		onToggleExpanded(parentFolderId, true);
	};

	handleMoveFolder = destFolderId => {
		if (destFolderId === 'isLocalFolder') {
			const {
				onCreateLocalFolder,
				folder,
				folder: { name },
				handleMoveToLocal
			} = this.props;
			if (!name.match(/^[A-Za-z0-9_\s]+$/)) {
				this.props.notify({
					message: <Text id="notifications.moveFolderSpecialCharWarning" />
				});
			} else {
				onCreateLocalFolder(name).then(() => handleMoveToLocal(folder));
			}
			return;
		}
		this.props
			.action({
				variables: {
					type: 'FolderAction',
					op: 'move',
					id: this.props.folder.id,
					folderId: destFolderId || USER_FOLDER_IDS.ROOT
				}
			})
			.then(() => {
				this.props.afterAction();
			});
		this.props.onToggleExpanded(destFolderId, true);
	};

	handleDblClick = () => {
		if (
			this.props.isSearchFolder ||
			(this.props.isRenameAllowed || isRenameAllowed)(this.props.folder && this.props.folder.name)
		) {
			this.handleRename();
		}
	};

	handleFolderDeleteClick = () => {
		const { view } = this.props;
		if (view === 'contactGroup') {
			this.props.confirmDeleteList();
		} else {
			this.props.confirmDelete();
		}
	};

	ensureFolderObject = folder =>
		typeof folder === 'string' ? { id: folder, name: folder } : folder;

	handleClick = e => {
		const { folder, onItemClick, matchesMediaQuery, hide: hideSidebar } = this.props;

		const folderObj = this.ensureFolderObject(folder);
		onItemClick && onItemClick(e, { isActive: this.isActive, folderObj });
		!matchesMediaQuery && hideSidebar();
	};

	handleExpandClick = ({ id, expanded }, e) => {
		e.stopPropagation();
		e.preventDefault();
		this.props.onToggleExpanded(id, !expanded);
	};

	static defaultProps = {
		onItemClick: () => {},
		onToggleExpanded: () => {},
		foldersExpanded: {},
		depth: 1,
		menu: null,
		disableCollapse: false,
		isSearchFolder: false
	};

	renderItem = ({ openContextMenu, menu }) => {
		const folder = menu.attributes.folder;
		const contextMenu = menu.attributes.menu;

		const {
			defaultShowEllispsis,
			foldersExpanded,
			urlSuffixProp,
			urlSlug,
			urlPrefix,
			slugs,
			indexFolder = {},
			badgeProp,
			folderNameProp,
			depth,
			onDrop,
			grouped,
			disableCollapse,
			showRefreshIcon,
			isRefreshing,
			matchesMediaQuery,
			isSearchFolder,
			hideFolder,
			isOffline,
			onIconClick,
			downloadInProgress
		} = this.props;

		const expanded = folder.id ? foldersExpanded[folder.id.toString()] === true : false;

		const urlSuffix =
			(urlSuffixProp && folder[urlSuffixProp]) ||
			(folder.isLocalFolder
				? folder.absFolderPath && folder.absFolderPath.replace(/(^\/|\/$)/, '')
				: encodeURIComponent(
						(folder.absFolderPath && folder.absFolderPath.replace(/(^\/|\/$)/, '')) ||
							folder.name ||
							folder.id
				  ));

		const url = `/${urlSlug}/${urlPrefix || ''}${urlSuffix}`;
		const subFolders = folder.folders || folder.folder;

		// If this folder is the `indexFolder`, and we are at the index route,
		// then use a blank regex to force this folder to be active.  assume / is the same as /email
		const urlRegex =
			folder.id === indexFolder.id &&
			new RegExp(`/${urlSlug === slugs.email ? `(?:${urlSlug})?` : urlSlug || ''}/?$`).test(
				window.location.href
			)
				? /(?:)/
				: new RegExp(`${url.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}($|/)`);

		// Do not match parent folders
		this.isActive = urlRegex.test(window.location.href);

		const badge =
			typeof badgeProp === 'function'
				? badgeProp(folder)
				: badgeProp !== false &&
				  folder[
						badgeProp ||
							(folder.name === 'Drafts' || folder.name === 'Outbox'
								? 'nonFolderItemCount'
								: 'unread')
				  ];

		const folderName =
			typeof folderNameProp === 'function'
				? folderNameProp(folder)
				: folder[folderNameProp || 'name'];

		const showMenuEllipsis = this.showMenuEllipsis() || defaultShowEllispsis;
		const isDropTarget = onDrop && canMoveMessagesIntoFolders([folder]).length > 0;
		return (
			<div>
				<div
					class={cx(
						style.item,
						style[`item--depth${depth}`],
						grouped && style.grouped,
						badge && style.hasBadge,
						!disableCollapse && subFolders && style.collapsible,
						this.state.dropTarget && style.dropTarget,
						this.state.dropped && style.dropped,
						hideFolder && style.hide
					)}
				>
					<MenuItem
						draggable={
							specialFolders([folder]).length === 1
								? 0
								: undefined /* https://github.com/developit/preact/issues/663 */
						}
						href={isSearchFolder ? this.getSearchURL(folder.query) : url}
						match={urlRegex}
						customClass={style.itemLink}
						activeClass={style.active}
						iconClass={style.icon}
						innerClass={style.itemInner}
						title={folder.name}
						onDragOver={isDropTarget && folder.droppable && this.handleDragOver}
						onDragEnter={isDropTarget && folder.droppable && this.handleDragOver}
						onDragLeave={isDropTarget && folder.droppable && this.handleDragLeave}
						onDrop={isDropTarget && folder.droppable && this.handleDrop}
						onClick={this.handleClick}
						onDblClick={callWith(this.handleDblClick, menu)}
					>
						{!disableCollapse && subFolders && (
							<CollapsibleControl
								collapsed={!expanded}
								onClick={callWith(
									this.handleExpandClick,
									{
										id: folder.id,
										expanded
									},
									true
								)}
								class={cx(
									style.folderCollapsibleControl,
									style[`folderCollapsibleControl--depth${depth}`],
									grouped && style.grouped
								)}
							/>
						)}
						<div class={cx(style.itemTitle)}>{folderName}</div>
						{!matchesMediaQuery && contextMenu && showMenuEllipsis && (
							<Icon
								name="ellipsis-h"
								size="sm"
								onClick={openContextMenu}
								class={style.contextMenuIcon}
							/>
						)}
						{(downloadInProgress || (this.isActive && showRefreshIcon)) && !isOffline && (
							<NakedButton
								class={cx(style.refresh, (downloadInProgress || isRefreshing) && style.refreshing)}
							>
								<Icon
									name="refresh"
									size="sm"
									onClick={callWith(onIconClick, { isActive: this.isActive })}
								/>
							</NakedButton>
						)}
						{!!badge && <div className={style.badge}>{badge}</div>}
					</MenuItem>

					{matchesMediaQuery && isSearchFolder && (
						<NakedButton
							class={style.folderItemAction}
							onClick={callWith(this.handleFolderDeleteClick, folder)}
						>
							<Icon name="close" size="sm" />
						</NakedButton>
					)}
				</div>

				{this.state.isCreatingSubFolder && (
					<NewFolder
						class={cx(style[`item--depth${depth}`], grouped && style.grouped)}
						onClose={this.handleCreateSubFolderClose}
						onSubmit={this.handleCreateSubFolderSubmit}
					/>
				)}
			</div>
		);
	};

	render(
		{
			depth,
			folder,
			folders,
			nameProp,
			foldersExpanded,
			confirmEmpty,
			menu,
			grouped,
			localFolders
		},
		{ isRenaming, renamingInputValue }
	) {
		folder = this.ensureFolderObject(folder);

		if (nameProp) folder.name = folder[nameProp];

		const expanded = folder.id ? foldersExpanded[folder.id.toString()] === true : false;

		let item;

		if (typeof folder.view === 'function') {
			item = h(folder.view, { folder, depth });
		} else {
			const {
				handleMoveFolder,
				handleMarkRead,
				handleRename,
				handleDelete,
				handleCreateSubFolder,
				handleEditSearch
			} = this;
			const Menu = this.customContextMenu() || menu;
			const { isSearchFolder } = this.props;

			item = isRenaming ? (
				<FolderInput
					class={cx(style[`item--depth${depth}`], grouped && style.grouped)}
					value={renamingInputValue}
					onInput={linkstate(this, 'renamingInputValue')}
					onClose={this.handleCloseRename}
					onSubmit={this.handleRenameSubmit}
				/>
			) : (
				<ContextMenu
					menu={
						<ClosableMenu
							menu={Menu}
							folder={folder}
							folders={folders}
							onMarkFolderRead={handleMarkRead}
							onEmptyFolder={confirmEmpty}
							onRenameFolder={handleRename}
							onMoveFolder={handleMoveFolder}
							onDeleteFolder={handleDelete}
							onCreateSubFolder={handleCreateSubFolder}
							onEditSearch={handleEditSearch}
							isSearchFolder={isSearchFolder}
							localFolders={localFolders}
						/>
					}
					render={this.renderItem}
				/>
			);

			const subFolders = folder.folders || folder.folder;

			if (subFolders) {
				item = (
					<div>
						{item}
						{expanded &&
							subFolders.map(subFolder => (
								<FolderListItem {...this.props} depth={(depth || 1) + 1} folder={subFolder} />
							))}
					</div>
				);
			}
		}

		return item;
	}
}

//decorate Menu wiwht
class ClosableMenu extends Component {
	handleMoveFolder = id => {
		this.props.onMoveFolder && this.props.onMoveFolder(id);
		this.props.onClose && this.props.onClose();
	};

	render({
		menu: Menu,
		folder,
		folders,
		onMarkFolderRead,
		onEmptyFolder,
		onRenameFolder,
		onDeleteFolder,
		onCreateSubFolder,
		onEditSearch,
		isSearchFolder,
		localFolders
	}) {
		return (
			<Menu
				folder={folder}
				folders={folders}
				onMarkFolderRead={onMarkFolderRead}
				onEmptyFolder={onEmptyFolder}
				onRenameFolder={onRenameFolder}
				onMoveFolder={this.handleMoveFolder}
				onDeleteFolder={onDeleteFolder}
				onCreateSubFolder={onCreateSubFolder}
				onEditSearch={onEditSearch}
				isSearchFolder={isSearchFolder}
				localFolders={localFolders}
			/>
		);
	}
}

class ConfirmDeleteDialog extends Component {
	// If this is in the trash or is a search folder,
	// prompt the user to permanently delete it.
	shouldPermanentlyDelete = () =>
		this.props.folder.parentFolderId === USER_FOLDER_IDS.TRASH.toString();

	isFolderSearchFolder = () => this.props.folder.query;

	performFolderAction = ({ type = 'FolderAction', id = this.props.folder.id, op, folderId }) => {
		const { action } = this.props;

		return action({
			variables: {
				type,
				id,
				op,
				folderId
			}
		});
	};

	handleConfirm = () => {
		let { closeDialog, folder, afterAction, isSearchFolder, localFolders } = this.props;
		const permanently = this.shouldPermanentlyDelete();
		if (folder.isLocalFolder) {
			const {
				account,
				localStorePath,
				folder: { name }
			} = this.props;

			localFolderHandler({
				operation: 'delete-folder',
				folderPath: localStorePath,
				accountName: account.name,
				name
			}).then(() => {
				localFolders = localFolders.filter(f => f.name !== name);
				afterAction(localFolders);
			});
		} else {
			this.performFolderAction({
				op: permanently ? 'delete' : 'move',
				folderId: permanently ? undefined : USER_FOLDER_IDS.TRASH.toString()
			}).then(() => {
				afterAction();

				// perform post processing if the deleted folder was search folder
				if (isSearchFolder && !permanently) {
					const timer = setTimeout(() => {
						this.performFolderAction({
							op: 'delete'
						});
					}, DEFAULT_NOTIFICATION_DURATION * 1000);

					this.props.notify({
						message: <DeletedSmartFolder name={folder.name} />,
						action: {
							label: <Text id={'buttons.undo'} />,
							fn: () => {
								timer && clearTimeout(timer);
								this.performFolderAction({
									op: 'move',
									folderId: USER_FOLDER_IDS.ROOT
								}).then(() => {
									this.props.notify({
										message: <MovedSmartFolderMessage name={folder.name} />
									});
									afterAction();
								});
							}
						}
					});
				}
			});
		}

		closeDialog && closeDialog();

		if (isActiveFolder(folder, getCurrentUrl())) {
			route('/');
		}
	};

	render(props) {
		return (
			<DeleteFolderDialog
				{...props}
				onConfirm={this.handleConfirm}
				permanent={this.shouldPermanentlyDelete()}
			/>
		);
	}
}

class ConfirmEmptyDialog extends Component {
	handleConfirm = () => {
		const { action, closeDialog, folder } = this.props;
		action({
			variables: {
				type: 'FolderAction',
				id: folder.id,
				op: 'empty'
			}
		}).then(() => {
			this.props.afterAction();
		});
		closeDialog && closeDialog();
	};

	render(props) {
		return <EmptyFolderDialog {...props} onConfirm={this.handleConfirm} />;
	}
}

// Compose HOCs with `compose` so that `FolderListItem` has the correct
// prop context for nested folders.
const FolderListItem = compose(
	graphql(ActionMutation, {
		props: ({ mutate }) => ({ action: mutate })
	}),
	withModifyContactList(),
	connect(
		state => ({
			isOffline: get(state, 'network.isOffline')
		}),
		{ notify, setShowAdvanced, setActiveSearch, hide }
	),
	configure('routes.slugs'),
	configure('routes.slugs,localStorePath'),
	withDialog('confirmDelete', <ConfirmDeleteDialog />),
	withDialog('confirmDeleteList', <DeleteList />),
	withDialog('confirmEmpty', <ConfirmEmptyDialog />),
	withMediaQuery(minWidth(screenSmMax))
)(BaseFolderListItem);

export default FolderListItem;
