import { h, Component } from 'preact';
import { route, getCurrentUrl } from 'preact-router';
import { Text, MarkupText } from 'preact-i18n';
import { connect } from 'preact-redux';
import { graphql } from 'react-apollo';
import { watchOfflineStatus } from '@zimbra/is-offline';
import get from 'lodash/get';
import findIndex from 'lodash-es/findIndex';
import find from 'lodash/find';
import { configure } from '../../config';
import { branch, compose as composer, defaultProps, withProps, withPropsOnChange } from 'recompose';
import { types as apiClientTypes, CacheType } from '@zimbra/api-client';
import { closeCompose, setMailListSortBy } from '../../store/email/actions';
import { removeTab } from '../../store/navigation/actions';
import { findFolderByName } from '../../utils/folders';
import { OUTBOX, DRAFTS, INBOX, TRASH } from '../../constants/folders';
import { MAIL_VIEW } from '../../constants/views';
import { trimMailFolderViewFromUri, isActiveFolder } from '../../utils/routing';
import {
	MANUAL_REFRESH,
	MIN_INTERVAL_VALUE,
	AS_NEW_MAIL_ARRIVES,
	DEFAULT_INTERVAL
} from '../../constants/mail';
import { absoluteUrl } from '../../lib/util';

import Fill from '../../components/fill';
import MailSidebar from '../../components/mail-sidebar';
import MailPane from '../../components/mail-pane';
import MailListFooter from '../../components/mail-list-footer';
import Draft from '../../components/draft';
import MailPrint from '../../components/mail-print';

import s from './style';
import withCommandHandlers from '../../keyboard-shortcuts/with-command-handlers';

import accountInfo from '../../graphql-decorators/account-info';
import getMailFolders from '../../graphql-decorators/get-mail-folders';
import search from '../../graphql-decorators/search';
import {
	getMailboxMetadata,
	getArchiveZimletMailboxMetadata
} from '../../graphql-decorators/mailbox-metadata';
import ConversationQuery from '../../graphql/queries/conversation.graphql';
import MessageQuery from '../../graphql/queries/message.graphql';
import { getSelectFlags } from '../../utils/mail-list';
import {
	withLoadLocalFolderEmails,
	withGetLocalFolderEmails,
	withGetLocalFolderEmail,
	withSaveLocalFolderEmails,
	withUpdateLocalFolderEmailAttachmentPath
} from '../../graphql-decorators/local-folder';
import { downloadMessage } from '../../graphql/queries/smime/download-message.graphql';
import { notify } from '../../store/notifications/actions';
import getApplicationStorage, { getApplicationStorageMaxSize } from '../../constants/storage';
import { getCacheByType } from '../../utils/in-memory-cache';
import { CachePersistor } from 'apollo-cache-persist';
import localFolderHandler from '../../../packages/@zimbra/electron-app/src/local-folder';
import withActionMutation from '../../graphql-decorators/with-action-mutation';
import AddMessageMutation from '../../graphql/mutations/add-message.graphql';
import localFolderEmailsQuery from '../../graphql/queries/local-folder/get-local-folder-emails.graphql';
import cloneDeep from 'lodash-es/cloneDeep';
import { RightSideAdSlot } from '../../components/ad-slots';
import { MILLISECONDS_MULTIPLIER } from '../../constants/mail-polling';
import { convertToMilliseconds } from '../../utils/mail-polling';
import { CANNOT_MOVE_INTO_LOCALFOLDER } from '../../utils/local-folder';
import { isOfflineModeEnabled } from '../../utils/offline';
import { guarenteeFolderExists } from '../../graphql-decorators/create-folder';
import withOfflineFolder from '../../graphql-decorators/offline-sync/with-offline-folder';

const { MailFolderView, PrefMailSelectAfterDelete, ActionOps, ActionType } = apiClientTypes;

const forceToMessageView = ['Drafts', 'Outbox'];

const AddShortcuts = withCommandHandlers(props => [
	{
		context: 'mail',
		command: 'FETCH_MAIL',
		handler: props.handleActiveFolderClick
	}
])(() => {});

@configure({
	urlSlug: 'routes.slugs.email',
	localFolderSlug: 'routes.slugs.localFolder',
	localStorePath: 'localStorePath'
})
@defaultProps({ folderName: 'Inbox' })
@getArchiveZimletMailboxMetadata()
@connect(
	(state, { compose }) => {
		if (state.email && state.email.compose) {
			compose = state.email.compose;
		}

		let { message } = compose || {};
		if (compose && !message) {
			message = compose;
		}

		return {
			compose,
			message,
			prevLocation: state.url.prevLocation,
			sortBy: state.email.sortBy,
			isOffline: state.network.isOffline
		};
	},
	{
		closeCompose,
		setMailListSortBy,
		removeTab,
		notify
	}
)
// Prime the cache with the mailbox metadata and folder list
@getMailboxMetadata()
@getMailFolders()
@accountInfo(({ data: { accountInfo: account } }) => ({
	viewType: account.prefs.zimbraPrefGroupMailBy,
	offlineModeEnabled: isOfflineModeEnabled(
		get(account, 'prefs.zimbraPrefWebClientOfflineBrowserKey')
	)
}))
@withProps(
	({
		folderName,
		account: {
			prefs: { zimbraPrefMarkMsgRead, zimbraPrefShowFragments, zimbraPrefMailPollingInterval } = {}
		} = {}
	}) => {
		let mailPollingInterval;

		if (
			zimbraPrefMailPollingInterval &&
			zimbraPrefMailPollingInterval !== MANUAL_REFRESH &&
			folderName === 'Inbox'
		) {
			mailPollingInterval =
				zimbraPrefMailPollingInterval === AS_NEW_MAIL_ARRIVES
					? MIN_INTERVAL_VALUE
					: zimbraPrefMailPollingInterval;

			mailPollingInterval = Math.max(
				MIN_INTERVAL_VALUE * MILLISECONDS_MULTIPLIER,
				convertToMilliseconds(mailPollingInterval) || DEFAULT_INTERVAL * MILLISECONDS_MULTIPLIER
			);
		}

		return {
			markAsReadAfterSeconds: zimbraPrefMarkMsgRead,
			showSnippets: zimbraPrefShowFragments,
			mailPollingInterval
		};
	}
)
@withPropsOnChange(
	['folderName', 'isOffline', 'localFolder', 'replyLocalFolder'],
	({ folderName, isOffline, localFolder, replyLocalFolder }) => {
		const viewType =
			forceToMessageView.indexOf(folderName) !== -1 || isOffline || localFolder || replyLocalFolder
				? MailFolderView.message
				: null;

		return (
			viewType && {
				viewType
			}
		);
	}
)
@search({
	skip: ({ account, localFolder }) => !account || localFolder,
	options: ({ viewType, sortBy, folderName, smartFolders, mailPollingInterval, isOffline }) => {
		// check if folderName is part of smartFolders, decide the value of query accordingly
		const smartFolder = smartFolders && find(smartFolders, { name: folderName });
		const query = smartFolder ? smartFolder.query : `in:"${folderName}"`;

		return {
			variables: {
				types: viewType || MailFolderView.conversation,
				limit: 50,
				recip: 2,
				sortBy,
				query,
				fullConversation: true
			},
			pollInterval: isOffline ? 0 : mailPollingInterval,
			// we should not need this fetchPolicy delcared here, but it was added to fix the issue that
			// this request was using the 'cache-first' even when user comes online after going offline, hence overrode here
			fetchPolicy: isOffline ? 'cache-first' : 'cache-and-network'
		};
	}
})
@branch(
	({ offlineModeEnabled }) => offlineModeEnabled,
	composer(
		guarenteeFolderExists({ folderName: OUTBOX }), // Must be after `getMailFolders()`
		withOfflineFolder({
			numDays: 30,
			folderName: INBOX,
			folderType: MAIL_VIEW,
			shouldRefresh: (props, nextProps) => {
				if (
					!nextProps.searchLoading &&
					nextProps.searchLoading !== props.searchLoading &&
					nextProps.viewType === MailFolderView.conversation
				) {
					// This block should execute only in Conversation view and in `online` mode when downloading convs is done (as `searchLoading` will turn `false`).
					const prevConvs = get(props, 'search.conversations') || []; // Old conversation list
					const nextConvs = get(nextProps, 'search.conversations') || []; // New conversation list

					if (nextConvs.length === prevConvs.length) {
						// If Old and New conversation lists are of same size, check any recent messages we got in conversation.
						let convUpdated = false;

						for (let i = 0, totalConvs = nextConvs.length; i < totalConvs; i++) {
							const dateOfMostRecentMsgInPrevConv = get(
								find(prevConvs, { id: nextConvs[i].id }),
								'date'
							);

							if (nextConvs[i].date !== dateOfMostRecentMsgInPrevConv) {
								// We found one such conversation which has new message in it. So, better to sync.
								convUpdated = true;
								break;
							}
						}

						return convUpdated;
					}

					return true; // If new Conversations received, definitely, we need to sync.
				}

				return false; // Syncing should execute only in Conversation view
			}
		}),
		withOfflineFolder({
			numDays: 30,
			folderName: DRAFTS,
			folderType: MAIL_VIEW
		}),
		withOfflineFolder({
			numDays: 1,
			folderName: OUTBOX,
			folderType: MAIL_VIEW
		}),
		withOfflineFolder({
			numDays: 1,
			folderName: TRASH,
			folderType: MAIL_VIEW
		})
	)
)
@graphql(MessageQuery, {
	name: 'messageQuery',
	skip: ({ id, viewType, localFolder }) =>
		!id || viewType !== MailFolderView.message || localFolder,
	options: ({ id }) => ({
		variables: {
			id
		}
	})
})
@graphql(ConversationQuery, {
	name: 'conversationQuery',
	skip: ({ id, viewType, localFolder }) =>
		!id || viewType !== MailFolderView.conversation || localFolder,
	options: ({ id, mailPollingInterval, isOffline }) => ({
		variables: {
			id,
			fetch: 'all',
			html: true,
			needExp: true,
			max: 250000,
			neuter: false
		},
		pollInterval: isOffline ? 0 : mailPollingInterval,
		// we should not need this fetchPolicy delcared here, but it was added to fix the issue that
		// this request was using the 'cache-first' even when user comes online after going offline, hence overrode here
		fetchPolicy: isOffline ? 'cache-first' : 'cache-and-network'
	})
})
@graphql(AddMessageMutation, {
	props: ({ mutate }) => ({
		addMessage: variables =>
			mutate({
				variables: {
					message: variables
				}
			})
	})
})
@withGetLocalFolderEmails({
	skip: ({ localFolder }) => !localFolder,
	options: ({ folderName }) => ({
		variables: {
			folderName
		}
	})
})
@withLoadLocalFolderEmails()
@withSaveLocalFolderEmails()
@withUpdateLocalFolderEmailAttachmentPath()
@withGetLocalFolderEmail({
	skip: ({ id, localFolder }) => !(id && localFolder),
	options: ({ id }) => ({
		variables: {
			id
		}
	})
})
@withActionMutation()
export default class Mail extends Component {
	state = {
		downloadInProgress: false
	};
	handleListScroll = () => {
		if (get(this.props, 'search.more') && !get(this.props, 'searchLoading')) {
			this.props.searchLoadNext();
		}
	};

	urlForMessage = (id, type = this.props.viewType, full = false, print = false) => {
		const { localFolder, localFolderSlug } = this.props;
		let url;

		if (localFolder) {
			url = `/${this.props.urlSlug}/${localFolderSlug}/${encodeURIComponent(
				this.props.folderName
			)}/${type}/${encodeURIComponent(id)}`;
		} else {
			url = `/${this.props.urlSlug}/${encodeURIComponent(
				this.props.folderName
			)}/${type}/${encodeURIComponent(id)}`;
		}

		if (print) {
			url += '/print';
		}

		if (full) {
			url += '?full=true';
		}

		return url;
	};

	routeToParentFolder = replace => {
		route(`/${this.props.urlSlug}/${encodeURIComponent(this.props.folderName)}`, replace);
	};

	routeToMailItem = (id, type) => route(this.urlForMessage(id, type, this.props.full), true);

	routeToPreviouslyActiveFolder = replace => {
		const { prevLocation } = this.props;
		route(prevLocation ? trimMailFolderViewFromUri(prevLocation.pathname) : `/`, replace);
	};

	routeToMailItemPrint = id => {
		const url = this.urlForMessage(id, this.props.viewType, this.props.full, true);
		window.open(absoluteUrl(url));
	};

	toggleAllowedFolders = flags => {
		const messageFlag = flags.map(f => f.flags);
		this.setState({
			flagOfCurrentMessage: getSelectFlags(messageFlag)
		});
		this.toggleLocalFolderForMove();
	};

	toggleLocalFolderForMove = () => {
		if (typeof process.env.ELECTRON_ENV !== 'undefined') {
			this.setState({
				disableLocalFolderForMove: false
			});
			const { viewType, localFolder } = this.props;
			if (viewType === 'message' && !localFolder) {
				const { folders, folderName } = this.props;
				const sourceFolder = findFolderByName(folders, folderName);
				const isInTrashSubFolder = (get(sourceFolder, 'absFolderPath') || '').match(/(^\/Trash\/)/);

				if (~CANNOT_MOVE_INTO_LOCALFOLDER.indexOf(sourceFolder.id) || isInTrashSubFolder) {
					this.setState({
						disableLocalFolderForMove: true
					});
				}
			}
		}
	};

	closeComposeTab = () => {
		const { removeTab: removeComposeTab, viewType, id } = this.props;
		removeComposeTab({ type: viewType, id });
	};

	closeMessageTab = () => {
		const { viewType, messageQuery, removeTab: closeTab, type } = this.props;
		if (messageQuery && viewType !== MailFolderView.conversation) {
			// close tab
			closeTab({ type, id: get(messageQuery, 'message.id') });
		}
	};

	handleCloseMessage = () => {
		this.routeToPreviouslyActiveFolder();
	};

	/**
	 * When deleting a message,
	 * this function will figure out which message will be the newly-active one
	 * - either the next message down if it exists, or,
	 * if the one being deleted is last in the list, then the previous one.
	 * Also handles removing message from the mail - pane.
	 * @param {Array} ids id(s) that are to be removed
	 * @returns {Function} returns with a call to the appropriate route function
	 */
	handleChangeActiveMessage = ids => {
		const { id: mailItemId, account, folderName, type } = this.props;
		const items = this.props.search.conversations || this.props.search.messages;

		//Get and sort the indexes of all of the selected ids in the items array
		const prevIndexes = ids.map(i => findIndex(items, ['id', i])).sort((a, b) => a - b);
		const activeIndex = findIndex(items, ['id', this.props.id]);

		let firstIndex = activeIndex;
		let lastIndex = activeIndex;
		//get the first index before the active mail item that is not in the selected list
		while (prevIndexes.indexOf(--firstIndex) !== -1);
		//get the first index after the active mail item that is not in the selected list
		while (prevIndexes.indexOf(++lastIndex) !== -1);

		// get a slice of items from our new range and remove any items from the slice that are in our selected list
		const itemsSlice = items
			.slice(Math.max(0, firstIndex), lastIndex + 1)
			.filter(({ id }) => ids.indexOf(id) === -1);

		// use the first and last items of whatever is left
		const prevId = get(itemsSlice, '0.id');
		const nextId = get(itemsSlice, `${itemsSlice.length - 1}.id`);

		const mailSelectAfterDelete = account.prefs.zimbraPrefMailSelectAfterDelete;

		if (mailSelectAfterDelete === PrefMailSelectAfterDelete.next && nextId && mailItemId) {
			return this.routeToMailItem(nextId, type);
		}
		if (mailSelectAfterDelete === PrefMailSelectAfterDelete.previous && prevId && mailItemId) {
			return this.routeToMailItem(prevId, type);
		}
		if (mailItemId) {
			return route(`/${this.props.urlSlug}/${encodeURIComponent(folderName)}`);
		}
	};

	handleClickItem = e => {
		const url = e.item ? this.urlForMessage(e.item.id, e.type) : '/';
		this.setState({
			flagOfCurrentMessage: e.item.flags
		});
		this.toggleLocalFolderForMove();
		route(url);
	};

	handleDblClickItem = e => {
		const url = e.item ? this.urlForMessage(e.item.id, e.type, true) : '/';
		route(url);
	};

	handleSend = () => {
		this.closeMessageTab();
		this.handleReload();

		if (this.props.viewType === MailFolderView.message) {
			this.closeComposeTab();
			this.routeToParentFolder();
		}
	};

	handleDraftSend = () => {
		this.handleReload();

		this.props.closeCompose && this.props.closeCompose();
		this.routeToPreviouslyActiveFolder();
	};

	handleDeleteDraft = () => {
		this.closeMessageTab();
		if (this.props.compose || this.props.viewType !== MailFolderView.conversation) {
			this.routeToPreviouslyActiveFolder();
			this.closeComposeTab();
		}
	};

	handleDraftCancel = () => {
		this.closeMessageTab();
		this.routeToPreviouslyActiveFolder();
		this.props.closeCompose();
	};

	handlePrint = id => {
		this.routeToMailItemPrint(id);
	};

	handleReload = (cancelClose = false) => {
		const { closeCompose: close, viewType, conversationQuery, refetchSearch } = this.props;

		!cancelClose && close && close();

		if (conversationQuery && viewType === MailFolderView.conversation) {
			conversationQuery.refetch();
		}

		return refetchSearch && refetchSearch();
	};

	handleLocalFolderReload = () => {
		const { loadLocalFolderEmails, localStorePath, account, folderName } = this.props;

		return loadLocalFolderEmails({
			accountName: account.name,
			dataDirPath: localStorePath,
			name: folderName
		}).then(() => this.props.localFolderEmailsRefetch());
	};

	handleSort = sortBy => this.props.setMailListSortBy(sortBy);

	handleClearSelection = () => {
		if (location.pathname.indexOf(this.props.id) !== -1) {
			// If selection is cleared while a mail item is open, route away from it.
			this.routeToParentFolder();
		}
	};

	handleDownloadEmails = (ids, name, folder = null) => {
		const { account, notify: notifyAction, localStorePath, saveLocalFolderEmails } = this.props;
		this.setState({ downloadInProgress: true }); // this state will help set the refresh icon while moving the emails to the local folder
		const saveMessagePromises = ids.map(id =>
			this.context.client.query({
				query: downloadMessage,
				variables: {
					id,
					isSecure: false
				}
			})
		);

		return Promise.all(saveMessagePromises)
			.then(
				downloadedMessage =>
					downloadedMessage &&
					downloadedMessage.length &&
					saveLocalFolderEmails({
						operation: 'save-file',
						dataDirPath: localStorePath,
						accountName: account.name,
						name,
						data: downloadedMessage.map(
							({
								data: {
									downloadMessage: { content }
								}
							}) => content
						)
					}).then(() => {
						this.props
							.action({
								removeFromList: true,
								type: ActionType.message,
								ids,
								op: ActionOps.delete
							})
							.then(() => {
								this.handleReload();
								this.setState({ downloadInProgress: false });
								notifyAction(
									folder
										? {
												message: (
													<Text id="local_folder.folderMove.success" fields={{ folder: name }} />
												)
										  }
										: {
												message: (
													<Text
														id="local_folder.movedSuccessfuly"
														plural={ids.length}
														fields={{ folder: name, count: ids.length }}
													/>
												)
										  }
								);
								folder && !folder.folders && this.handleDeleteFolder(folder, false);
							});
					})
			)
			.catch(err => {
				this.setState({ downloadInProgress: false });
				notifyAction({
					message: <Text id="local_folder.folderMove.error" />,
					failure: true
				});
				console.error(err);
			});
	};

	updateCacheForRemovedMessages = (folderName, movedIds) => {
		const cache = getCacheByType(this.context.client, CacheType.local);
		let cacheData;

		try {
			cacheData = cache.readQuery({
				query: localFolderEmailsQuery,
				variables: {
					folderName
				}
			});
		} catch (error) {
			console.error({ error });
		}

		if (cacheData) {
			const messages = cacheData.localFolderEmails.filter(m => movedIds.indexOf(m.id) === -1);
			cache.writeQuery({
				query: localFolderEmailsQuery,
				variables: {
					folderName
				},
				data: {
					localFolderEmails: messages
				}
			});
		}

		const localCacheData = cloneDeep(get(cache, 'data'));
		movedIds.forEach(id =>
			Object.keys(localCacheData.data).forEach(key => {
				if (key === 'ROOT_QUERY') {
					delete localCacheData.data.ROOT_QUERY[`localFolderEmail({"id":"${id}"})`];
				} else if (key.indexOf(`MessageInfo:${id}`) > -1) {
					localCacheData.delete(key);
				}
			})
		);
		cache.restore(localCacheData.data);
		route(trimMailFolderViewFromUri(location.pathname));
	};

	handleUploadEmails = (ids, name, folderId, destFolderName) => {
		const { account, notify: notifyAction, localStorePath, addMessage } = this.props;

		const deleteLocalMessage = movedIds => {
			localFolderHandler({
				operation: 'delete-mimes',
				folderPath: localStorePath,
				accountName: account.name,
				name,
				data: movedIds
			}).then(() => {
				this.updateCacheForRemovedMessages(name, movedIds);

				notifyAction({
					message:
						movedIds.length < ids.length ? (
							<Text
								id="local_folder.partiallyMoved"
								fields={{ folder: destFolderName, count: movedIds.length, total: ids.length }}
							/>
						) : (
							<Text
								id="local_folder.movedSuccessfuly"
								plural={ids.length}
								fields={{ folder: destFolderName, count: movedIds.length }}
							/>
						)
				});
			});
		};

		localFolderHandler({
			operation: 'read-mimes-to-upload',
			folderPath: localStorePath,
			accountName: account.name,
			name,
			data: ids
		}).then(msgs => {
			const movedMessages = [];
			const addMessagesPromise = msgs.map(({ id, msgContent }) =>
				addMessage({
					folderId,
					content: {
						_content: msgContent
					}
				}).then(() => movedMessages.push(id))
			);

			Promise.all(addMessagesPromise)
				.then(() => deleteLocalMessage(movedMessages))
				.catch(() =>
					movedMessages.length
						? deleteLocalMessage(movedMessages)
						: notifyAction({
								message: <Text id="local_folder.errorMessage" />,
								failure: true
						  })
				);
		});
		return;
	};

	handleDeleteFolder = (folder, showNotification) => {
		const { notify: notifyAction, action, refetchFolders } = this.props;

		showNotification &&
			notifyAction({
				message: <Text id="local_folder.folderMove.success" fields={{ folder: folder.name }} />
			});

		action({
			type: ActionType.folder,
			id: folder.id,
			op: ActionOps.delete
		}).then(() => {
			refetchFolders();
			if (isActiveFolder(folder, getCurrentUrl())) {
				route('/');
			}
		});
	};

	state = {
		flagOfCurrentMessage: undefined,
		disableLocalFolderForMove: undefined
	};

	loadLocalFolderCache = (account, localStorePath, folderName) => {
		const storagePath = localFolderHandler({
			operation: 'get-local-folder-path',
			accountName: account.name,
			folderPath: localStorePath,
			name: folderName
		});
		getApplicationStorage(storagePath).then(storage => {
			this.persistLocalCache = new CachePersistor({
				cache: getCacheByType(this.context.client, CacheType.local),
				storage,
				maxSize: getApplicationStorageMaxSize()
			});
			this.persistLocalCache.restore().then(() => {
				this.context.client.queryManager.broadcastQueries();
				this.props.localFolderEmailsRefetch();
			});
		});
	};

	clearLocalFolderCache = () => {
		if (this.persistLocalCache) {
			this.persistLocalCache.remove();
		}
	};

	checkLocalFolderAndPerformAction = folderName => {
		const { account, localStorePath } = this.props;
		localFolderHandler({
			operation: 'check-folder-status',
			accountName: account.name,
			folderPath: localStorePath,
			name: folderName
		})
			.then(() => {
				this.loadLocalFolderCache(account, localStorePath, folderName);
			})
			.catch(() => {
				this.clearLocalFolderCache();
				this.routeToPreviouslyActiveFolder(true);
			});
	};

	getChildContext() {
		return {
			changeActiveMessage: this.handleChangeActiveMessage
		};
	}

	componentWillMount = () => {
		const { folderName, localFolder } = this.props;

		if (typeof process.env.ELECTRON_ENV !== 'undefined' && localFolder && folderName) {
			this.checkLocalFolderAndPerformAction(folderName);
		}

		this.unwatchOfflineStatus = watchOfflineStatus(offline => {
			if (!offline) {
				if (!this.props.compose && this.props.folderName === OUTBOX) {
					this.routeToParentFolder(true);
				}

				setTimeout(() => {
					// When the App comes back online, wait for OfflineQueueLink to sync
					// and then refetch search results to get latest data after sync.
					this.handleReload(true);
				}, 2500);
			}
		});
	};

	componentWillReceiveProps({
		type,
		viewType,
		id,
		folderName,
		conversationQuery,
		compose,
		account,
		localStorePath,
		localFolder,
		localFolderEmail: { attachments, inlineAttachments } = {}
	}) {
		if (typeof process.env.ELECTRON_ENV !== 'undefined' && localFolder) {
			if (folderName !== this.props.folderName) {
				this.checkLocalFolderAndPerformAction(folderName);
			}

			if (id !== this.props.id && (attachments || inlineAttachments)) {
				const storagePath = localFolderHandler({
					operation: 'get-local-folder-path',
					accountName: account.name,
					folderPath: localStorePath,
					name: folderName
				});

				const invalidAttachments = [...attachments, ...inlineAttachments].filter(
					attachment => attachment.url.indexOf(storagePath) === -1
				);

				invalidAttachments.length &&
					this.props
						.updateLocalFolderEmailAttachmentPath({
							id,
							accountName: account.name,
							folderPath: localStorePath,
							folderName
						})
						.then(() => this.props.localFolderEmailRefetch());
			}
		}

		const newConvId = get(conversationQuery, 'conversation.id'),
			loading = get(conversationQuery, 'loading');

		//The conversation ID can change for the selected conversation when going from a single-message conversation to a
		//multi-message conversation.  Change the route appropriately when that happens
		if (!loading && newConvId && id !== newConvId) {
			return this.routeToMailItem(newConvId, type);
		}

		if (
			!compose &&
			this.props.folderName === folderName &&
			this.props.viewType !== viewType &&
			!(this.props.localFolder || localFolder)
		) {
			// Reload the Mail screen when viewType has changed but folderName has not.
			this.routeToParentFolder();
		}
	}

	componentWillUnmount() {
		this.isUmounted = true;
		clearTimeout(this.markAsReadTimer);
		this.unwatchOfflineStatus();
		this.props.closeCompose();
	}

	renderNoItems = () => (
		<MailListFooter>
			<span>
				{this.props.searchError ? (
					[<Text id="app.generalError" />, `: ${this.props.searchError}`]
				) : (
					<MarkupText id="mail.folders.IS_EMPTY" fields={{ name: this.props.folderName }} />
				)}
			</span>
		</MailListFooter>
	);

	render(
		{
			account,
			conversationQuery,
			disableList,
			disableMessageNavigation,
			folderName,
			full,
			id,
			url,
			type,
			searchError,
			compose,
			message,
			messageQuery,
			search: results,
			searchLoading,
			viewType,
			refetchSearch,
			smartFolders,
			inboxFolder,
			refetchFolders,
			folders,
			prevLocation,
			isOffline,
			localFolder,
			localFolderEmails,
			localFolderEmail,
			replyLocalFolder
		},
		{ flagOfCurrentMessage, downloadInProgress, disableLocalFolderForMove }
	) {
		let mailItem;

		if (localFolder && localFolderEmail) {
			mailItem = localFolderEmail;
		} else {
			mailItem =
				(conversationQuery &&
					get(conversationQuery, 'conversation.id') === id &&
					conversationQuery.conversation) ||
				(messageQuery && messageQuery.message);
		}

		let items;
		const isPrint = url.substring(url.lastIndexOf('/')) === '/print';
		const folder = localFolder ? { name: folderName } : findFolderByName(folders, folderName);

		if (isPrint) {
			return <MailPrint id={id} />;
		}

		if (localFolder) {
			items = localFolderEmails;
		} else if (results) {
			items = viewType === MailFolderView.conversation ? results.conversations : results.messages;
		}

		return (
			<Fill>
				<AddShortcuts handleActiveFolderClick={this.handleActiveFolderClick} />
				<MailSidebar
					folder={folder}
					refresh={!localFolder && this.handleReload}
					onIconClick={localFolder && this.handleLocalFolderReload}
					folders={folders}
					smartFolders={smartFolders}
					inboxFolder={inboxFolder}
					refetchFolders={refetchFolders}
					onClearSelection={this.handleClearSelection}
					arrayOfFlags={flagOfCurrentMessage}
					downloadEmails={this.handleDownloadEmails}
					uploadEmails={this.handleUploadEmails}
					clearLocalFolderCache={this.clearLocalFolderCache}
					downloadInProgress={downloadInProgress}
					isInLocalFolder={localFolder}
					deleteFolder={this.handleDeleteFolder}
					disableLocalFolderForMove={disableLocalFolderForMove}
				/>
				<div class={s.mainWrapper}>
					{compose ? (
						<Draft
							messageDraft={message}
							onSend={this.handleDraftSend}
							onCancel={this.handleDraftCancel}
							onDelete={this.handleDeleteDraft}
							onSave={conversationQuery && conversationQuery.refetch}
							autofocus={!!compose}
							isOffline={isOffline}
						/>
					) : (
						<MailPane
							key={id}
							type={type}
							listType={viewType}
							items={!searchError && items}
							pending={searchLoading}
							sortBy={results ? results.sortBy : 'dateDesc'}
							more={results ? results.more : false}
							mailItem={mailItem && mailItem.id === id && mailItem}
							mailItemId={id}
							folder={folder}
							changeActiveMessage={this.handleChangeActiveMessage}
							afterBulkDelete={refetchSearch}
							onScroll={this.handleListScroll}
							onItemClick={this.handleClickItem}
							onItemDblClick={this.handleDblClickItem}
							onReload={this.handleReload}
							downloadEmails={this.handleDownloadEmails}
							uploadEmails={this.handleUploadEmails}
							onSend={this.handleSend}
							onSaveDraft={
								viewType === MailFolderView.conversation
									? conversationQuery && conversationQuery.refetch
									: messageQuery && messageQuery.refetch
							}
							onCancelDraft={this.handleDraftCancel}
							onDeleteDraft={this.handleDeleteDraft}
							onSort={this.handleSort}
							onPrint={this.handlePrint}
							headerClass={s.mailHeader}
							renderNoItems={this.renderNoItems}
							disableList={disableList || full === 'true'}
							disableMessageNavigation={disableMessageNavigation}
							showSnippets={account.prefs.zimbraPrefShowFragments}
							selectMessage={this.routeToMailItem}
							onCloseMessage={this.handleCloseMessage}
							flagOfCurrentMessage={flagOfCurrentMessage}
							toggleAllowedFolders={this.toggleAllowedFolders}
							prevLocation={prevLocation}
							localFolder={localFolder}
							replyLocalFolder={replyLocalFolder}
							disableLocalFolderForMove={disableLocalFolderForMove}
							toggleLocalFolderForMove={this.toggleLocalFolderForMove}
						/>
					)}

					<RightSideAdSlot />
				</div>
			</Fill>
		);
	}
}
