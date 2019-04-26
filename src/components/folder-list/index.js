import { h } from 'preact';
import { Text } from 'preact-i18n';
import PureComponent from '../../lib/pure-component';
import get from 'lodash/get';
import omit from 'lodash-es/omit';
import {
	specialFolders as computeSpecialFolders,
	customFolders as computeCustomFolders,
	filteredFolders
} from '../../utils/folders';
import { getCurrentUrl, route } from 'preact-router';
import linkstate from 'linkstate';
import { pluck } from '../../lib/util';
import { Icon } from '@zimbra/blocks';
import FolderListItem from './item';
import FolderGroup from './group';
import NewFolder from './new-folder';
import FolderInput from '../folder-input';
import ZimletSlot from '../zimlet-slot';
import { connect } from 'preact-redux';
import cx from 'classnames';
import { defaultProps, withProps, branch, renderNothing } from 'recompose';
import style from './style';
import { MAIL_VIEW } from '../../constants/views';
import { OUTBOX } from '../../constants/folders';
import { closeCompose } from '../../store/email/actions';
import { notify } from '../../store/notifications/actions';
import { setTrashFolder } from '../../store/trash-folder/actions';
import { setJunkFolder } from '../../store/junk-folder/actions';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenSmMax } from '../../constants/breakpoints';

import withAccountConfigure from '../../utils/account-config';
import accountInfo from '../../graphql-decorators/account-info';
import {
	getMailboxMetadata,
	withSetMailboxMetaData
} from '../../graphql-decorators/mailbox-metadata';
import { normalizeFoldersExpanded, serializeFoldersExpanded } from '../../utils/prefs';
import { isOfflineModeEnabled } from '../../utils/offline';
import withCreateFolderMutation from '../../graphql-decorators/create-folder';
import { getAllowedFoldersForMove, addDropKey } from '../../utils/mail-list';
import {
	getFolderNameValidationStatus,
	INVALID_FOLDER_NAME_ERRORS,
	FOLDER_NAME_CHAR_LIMIT,
	LOCAL_FOLDER_ABSFOLDERPATH_PREFIX
} from './util';
import localFolderHandler from '@zimbra/electron-app/src/local-folder';
import { configure } from '../../config';
import SearchQuery from '../../graphql/queries/search/search.graphql';
import { faultCode } from '../../utils/errors';

@defaultProps({ view: MAIL_VIEW })
@accountInfo()
@getMailboxMetadata()
@branch(({ folders }) => !folders, renderNothing)
@withSetMailboxMetaData()
@connect(
	state => ({
		isOffline: get(state, 'network.isOffline'),
		trashFolder: get(state, 'trashFolder.folderInfo'),
		junkFolder: get(state, 'junkFolder.folderInfo'),
		activeAccount: state.activeAccount
	}),
	{
		closeCompose,
		notifyAction: notify,
		setTrashFolder,
		setJunkFolder
	}
)
@withCreateFolderMutation()
@withProps(({ folders, indexFolderName }) => ({
	indexFolder: folders && pluck(folders, 'name', indexFolderName)
}))
@withMediaQuery(minWidth(screenSmMax))
@configure('routes.slugs')
@withAccountConfigure()
export default class FolderList extends PureComponent {
	state = {
		isRefreshing: false,
		isAddingNewFolder: false,
		isFindingFolder: false,
		searchQuery: '',
		isAddingNewLocalFolder: false,
		toggleLocalTreeOpen: !!(this.props.localFolders && this.props.localFolders.length > 0),
		localFolderArray: this.props.localFolders
	};

	getTrashFolder(props) {
		const { folders, trashFolder } = props;
		const trash = folders.find(f => f.name === 'Trash');
		if (trashFolder && trashFolder.id !== trash.id) {
			this.props.setTrashFolder(trash);
		}
	}

	getJunkFolder(props) {
		const { folders, junkFolder } = props;
		const junk = folders.find(f => f.name === 'Junk');
		if (junkFolder && junkFolder.id !== junk.id) {
			this.props.setJunkFolder(junk);
		}
	}

	handleAfterAction = localFolderArray => {
		if (localFolderArray) {
			this.setState({
				toggleLocalTreeOpen: false,
				localFolderArray
			});
			this.props.clearLocalFolderCache();
		} else {
			this.props.refetchFolders();
		}
	};

	folderMap = (params = {}) => folder =>
		this.folderLink({
			folder,
			foldersExpanded: this.props.foldersExpanded,
			menu: this.props.defaultContextMenu,
			...params
		});

	folderLink = ({
		folder,
		menu,
		foldersExpanded = {},
		disableCollapse = false,
		grouped = false
	}) => {
		const {
			urlSlug,
			badgeProp,
			nameProp,
			onDrop,
			dropEffect,
			view,
			folders,
			urlSuffixProp,
			smartFolders,
			indexFolder,
			folderNameProp,
			customContextMenus,
			defaultShowEllipsis,
			account,
			downloadInProgress
		} = this.props;

		const { localFolderArray } = this.state;

		return (
			<FolderListItem
				afterAction={this.handleAfterAction}
				createFolder={this.createFolder}
				indexFolder={indexFolder}
				folder={folder}
				folders={folder.query ? smartFolders : folders}
				menu={menu}
				view={view}
				depth={1}
				urlSlug={urlSlug}
				urlSuffixProp={urlSuffixProp}
				badgeProp={badgeProp}
				nameProp={nameProp}
				onDrop={!folder.query && onDrop}
				onItemClick={this.reload}
				dropEffect={dropEffect}
				showRefreshIcon={folder.name === 'Inbox' || folder.isLocalFolder}
				onIconClick={this.reloadLocalFolderItems}
				isRefreshing={this.state.isRefreshing}
				foldersExpanded={foldersExpanded}
				onToggleExpanded={this.setFolderExpanded}
				disableCollapse={disableCollapse}
				customContextMenus={customContextMenus}
				defaultShowEllipsis={defaultShowEllipsis}
				grouped={grouped}
				folderNameProp={folderNameProp}
				isSearchFolder={Boolean(folder.query)}
				account={account}
				hideFolder={
					folder.name === OUTBOX &&
					!isOfflineModeEnabled(get(account, 'prefs.zimbraPrefWebClientOfflineBrowserKey'))
				}
				localFolders={localFolderArray}
				onCreateLocalFolder={this.handleCreateLocalFolder}
				downloadInProgress={folder.isLocalFolder && downloadInProgress}
				handleMoveToLocal={this.handleMoveToLocal}
			/>
		);
	};

	reload = (e, { isActive }) => {
		const { refresh, isOffline } = this.props;
		if (isActive && !isOffline && refresh) {
			this.setState({ isRefreshing: true });
			refresh().then(() => {
				this.setState({ isRefreshing: false });
			});
		}
	};

	reloadLocalFolderItems = ({ isActive }) => {
		const { onIconClick, isOffline } = this.props;
		if (isActive && !isOffline && onIconClick) {
			this.setState({ isRefreshing: true });
			onIconClick().then(() => {
				this.setState({ isRefreshing: false });
			});
		}
	};

	setFolderTreeOpen = val => {
		if (this.props.folderTreeOpen !== val) {
			this.props.setMailboxMetadata({
				zimbraPrefCustomFolderTreeOpen: val
			});
		}
	};

	setSmartFolderTreeOpen = val => {
		if (this.props.smartFolderTreeOpen !== val) {
			this.props.setMailboxMetadata({
				zimbraPrefSmartFolderTreeOpen: val
			});
		}
	};

	setFolderExpanded = (id, val) => {
		const { zimbraPrefFoldersExpanded } = this.props.mailboxMetadata;
		this.props.setMailboxMetadata({
			zimbraPrefFoldersExpanded: serializeFoldersExpanded({
				...normalizeFoldersExpanded(zimbraPrefFoldersExpanded),
				[id]: val
			})
		});
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

			this.props.notifyAction({
				failure: true,
				message
			});
		}
		return isValid;
	};

	handleOpenNewTopLevelFolder = () => {
		this.setState({
			isAddingNewFolder: true,
			isFindingFolder: false
		});
		this.setFolderTreeOpen(true);
	};

	handleOpenNewTopLevelLocalFolder = () => {
		this.setState({
			isAddingNewLocalFolder: true,
			toggleLocalTreeOpen: true
		});
	};

	handleFolderSearchOpen = () => {
		this.setState({
			isFindingFolder: true,
			isAddingNewFolder: false
		});
		this.setFolderTreeOpen(true);
	};

	handleSmartFolderSearchOpen = () => {
		this.setState({
			isFindingSmartFolder: true
		});
		this.setSmartFolderTreeOpen(true);
	};

	handleFolderPlusClick = e => {
		e.stopPropagation();
		this.handleOpenNewTopLevelFolder();
	};

	handleLocalFolderPlusClick = e => {
		e.stopPropagation();
		this.handleOpenNewTopLevelLocalFolder();
	};

	handleFolderSearchClick = e => {
		e.stopPropagation();
		this.handleFolderSearchOpen();
	};

	handleSmartFolderSearchClick = e => {
		e.stopPropagation();
		this.handleSmartFolderSearchOpen();
	};

	handleCreateTopLevelFolder = name => {
		const { view } = this.props;
		if (!this.validateFolderName(name)) {
			return;
		}

		this.setState({ isAddingNewFolder: false });
		return this.createFolder({
			name,
			view
		});
	};

	handleMoveToLocal = folder => {
		const { name, absFolderPath } = folder;
		const { downloadEmails, deleteFolder, notifyAction } = this.props;
		this.context.client
			.query({
				query: SearchQuery,
				variables: {
					types: 'message',
					query: `in:"${absFolderPath}"`,
					recip: 2,
					sortBy: 'dateDesc',
					limit: 1000
				}
			})
			.then(({ data }) => {
				const messages = get(data, 'search.messages');
				const ids = messages && messages.map(message => message.id);
				ids
					? downloadEmails(ids, name, folder)
					: folder && !folder.folders
					? deleteFolder(folder, true)
					: notifyAction({
							message: <Text id="local_folder.folderMove.success" fields={{ folder: name }} />
					  });
			});
	};

	setLocalFolderDroppableValue = value => {
		this.setState(state => {
			const localFolderArray = state.localFolderArray;
			localFolderArray[0].droppable = !value;
			return {
				localFolderArray
			};
		});
	};

	handleCreateLocalFolder = name => {
		const localFolder = {
			localFolders: [
				{
					name,
					droppable: true,
					isLocalFolder: true,
					absFolderPath: LOCAL_FOLDER_ABSFOLDERPATH_PREFIX + name
				}
			]
		};
		const {
			account: { name: accountName },
			localStorePath
		} = this.props;

		if (!this.validateFolderName(name, true)) {
			return;
		}

		return localFolderHandler({
			operation: 'create-folder',
			folderPath: localStorePath,
			accountName,
			name,
			data: localFolder
		}).then(() => {
			this.setState({
				toggleLocalTreeOpen: true,
				isAddingNewLocalFolder: false,
				localFolderArray: localFolder.localFolders
			});
		});
	};

	createFolder = options =>
		this.props
			.createFolder({
				variables: options
			})
			.then(() => {
				this.props.refetchFolders();
			})
			.catch(err => {
				const errCode = faultCode(err);

				if (errCode && errCode === 'mail.ALREADY_EXISTS') {
					this.props.notifyAction({
						failure: true,
						message: <Text id={`faults.${errCode}_folder`} fields={{ name: options.name }} />
					});
				}
			});

	handleCloseCreateTopLevelFolder = () => {
		this.setState({ isAddingNewFolder: false });
	};

	handleCloseCreateTopLevelLocalFolder = () => {
		this.setState({
			isAddingNewLocalFolder: false
		});
	};

	handleFolderSearchClose = () => {
		this.setState({
			isFindingFolder: false,
			searchQuery: ''
		});
	};

	handleSmartFolderSearchClose = () => {
		this.setState({
			isFindingSmartFolder: false,
			searchSmartQuery: ''
		});
	};

	handleToggleFolders = () => {
		this.setFolderTreeOpen(!this.props.folderTreeOpen);
	};

	handleToggleSmartFolders = () => {
		this.setSmartFolderTreeOpen(!this.props.smartFolderTreeOpen);
	};

	handleToggleLocalFolders = () => {
		this.setState(state => ({
			toggleLocalTreeOpen: !state.toggleLocalTreeOpen
		}));
	};

	static defaultProps = {
		onActiveFolderClick: () => {},
		smartFolders: []
	};

	componentWillReceiveProps(nextProps) {
		nextProps.activeAccount.id !== get(this.props, 'activeAccount.id') &&
			(this.getTrashFolder(nextProps) || this.getJunkFolder(nextProps));
	}

	/**
	 *  On `componentDidUpdate`, Check whether routed folder exist or not.
	 *  If it doesn't, then route it to default entry point('/').
	 */
	componentDidUpdate({ folders = [], urlSlug = '' }) {
		const { folders: updatedFolderList } = this.props;

		if (urlSlug !== 'email' || updatedFolderList.length === folders.length) {
			return false;
		}

		const currentUrl = decodeURIComponent(getCurrentUrl());
		if (currentUrl !== '/') {
			const matchedFolder = updatedFolderList.find(
				({ absFolderPath }) => `${currentUrl}/`.indexOf(`/${urlSlug}${absFolderPath}/`) >= 0
			);

			if (!matchedFolder) {
				// `route`  will be executed while child components would be re-rendering. In such case,
				// it will throw `constructor of null` error. Added `setTimeout` to fix it.
				setTimeout(() => route('/'), 0);
			}
		}
	}

	render(
		{
			account,
			folders,
			smartFolders,
			divided,
			label,
			badgeProp,
			urlSlug,
			slugs,
			onDrop,
			dropEffect,
			collapsibleCustomGroup,
			collapsibleSmartGroup,
			folderTreeOpen,
			foldersExpanded,
			defaultContextMenu,
			specialFolderList,
			hiddenFolderList = [],
			smartFolderTreeOpen,
			showSmartFolders,
			matchesMediaQuery,
			indexFolderName,
			arrayOfFlags,
			disableLocalFolderForMove,
			...props
		},
		{
			isAddingNewFolder,
			isFindingFolder,
			isFindingSmartFolder,
			searchQuery,
			searchSmartQuery,
			toggleLocalTreeOpen,
			isAddingNewLocalFolder,
			localFolderArray
		}
	) {
		if (!folders || folders.length === 0) {
			return null;
		}

		if (indexFolderName === 'Contacts' && folders && folders.length) {
			folders = addDropKey(folders, true);
		} else {
			folders = getAllowedFoldersForMove(arrayOfFlags, folders);
		}
		// Remove hidden folders
		folders = computeCustomFolders(folders, hiddenFolderList);

		const specialFolders = computeSpecialFolders(folders, specialFolderList);
		const customFolders = computeCustomFolders(folders, specialFolderList);

		if (
			disableLocalFolderForMove !== undefined &&
			disableLocalFolderForMove === get(localFolderArray, '0.droppable')
		) {
			this.setLocalFolderDroppableValue(disableLocalFolderForMove);
		}
		return (
			<div
				{...omit(props, ['indexFolder', 'indexFolderName', 'view', 'mailboxMetadata'])}
				class={cx(style.folderList, props.class)}
			>
				{specialFolders.map(this.folderMap())}

				<ZimletSlot name="folder-list-middle" />

				{divided && specialFolders.length > 0 && folders.length > 0 && (
					<div class={style.divider}>
						<Text id="folderlist.folders" />
					</div>
				)}

				{smartFolders.length && collapsibleSmartGroup ? (
					<FolderGroup
						onToggle={this.handleToggleSmartFolders}
						collapsed={!smartFolderTreeOpen}
						menu={false}
						name={
							<div class={style.customFolderToggle}>
								<div class={style.customFolderToggleName}>
									<Text id="folderlist.saved_searches" />
								</div>
								<div class={style.folderGroupAction} onClick={this.handleSmartFolderSearchClick}>
									<Icon name="search" size="sm" />
								</div>
							</div>
						}
					>
						{isFindingSmartFolder && (
							<FolderInput
								value={searchSmartQuery}
								onClose={this.handleSmartFolderSearchClose}
								onInput={linkstate(this, 'searchSmartQuery')}
								class={style.topLevelInput}
								closeOnBlur={false}
								placeholderTextId="mail.folders.FIND_PLACEHOLDER"
								icon="search"
							/>
						)}

						{searchSmartQuery
							? filteredFolders(smartFolders, searchSmartQuery).map(
									this.folderMap({ disableCollapse: true, menu: false })
							  )
							: smartFolders.map(this.folderMap({ grouped: true, menu: false }))}
					</FolderGroup>
				) : (
					smartFolders.map(this.folderMap({ menu: false }))
				)}

				{divided && specialFolders.length > 0 && folders.length > 0 && (
					<div class={style.divider}>
						<Text id="folderlist.folders" />
					</div>
				)}

				{collapsibleCustomGroup ? (
					<FolderGroup
						onToggle={this.handleToggleFolders}
						onCreateFolder={this.handleOpenNewTopLevelFolder}
						onFindFolder={this.handleFolderSearchOpen}
						collapsed={!folderTreeOpen}
						name={
							<div class={style.customFolderToggle}>
								<div class={style.customFolderToggleName}>
									<Text id="folderlist.folders" />
								</div>
								{matchesMediaQuery && (
									<div class={style.folderGroupAction} onClick={this.handleFolderSearchClick}>
										<Icon name="search" size="sm" />
									</div>
								)}
								<div class={style.folderGroupAction} onClick={this.handleFolderPlusClick}>
									<Icon name="plus" size="sm" />
								</div>
							</div>
						}
					>
						<ZimletSlot name="folder-group" />

						{isAddingNewFolder && (
							<NewFolder
								class={style.topLevelInput}
								onSubmit={this.handleCreateTopLevelFolder}
								onClose={this.handleCloseCreateTopLevelFolder}
							/>
						)}

						{isFindingFolder && (
							<FolderInput
								value={searchQuery}
								onClose={this.handleFolderSearchClose}
								onInput={linkstate(this, 'searchQuery')}
								class={style.topLevelInput}
								closeOnBlur={false}
								placeholderTextId="mail.folders.FIND_PLACEHOLDER"
								icon="search"
							/>
						)}

						{searchQuery
							? filteredFolders(customFolders, searchQuery).map(
									this.folderMap({ disableCollapse: true })
							  )
							: customFolders.map(this.folderMap({ grouped: true }))}
					</FolderGroup>
				) : (
					customFolders.map(this.folderMap())
				)}
				{process.env.ELECTRON_ENV && (
					<FolderGroup
						onToggle={this.handleToggleLocalFolders}
						collapsed={!toggleLocalTreeOpen}
						onCreateFolder={this.handleOpenNewTopLevelLocalFolder}
						name={
							<div class={style.customFolderToggle}>
								<div class={style.customFolderToggleName}>
									<Text id="folderlist.local_folder" />
								</div>
								{!(localFolderArray && localFolderArray.length > 0) && (
									<div class={style.folderGroupAction} onClick={this.handleLocalFolderPlusClick}>
										<Icon name="plus" size="sm" />
									</div>
								)}
							</div>
						}
					>
						{isAddingNewLocalFolder && (
							<NewFolder
								class={style.topLevelInput}
								onSubmit={this.handleCreateLocalFolder}
								onClose={this.handleCloseCreateTopLevelLocalFolder}
							/>
						)}

						{localFolderArray && localFolderArray.map(this.folderMap({ grouped: true }))}
					</FolderGroup>
				)}
				<ZimletSlot name="folder-list-end" />
			</div>
		);
	}
}
