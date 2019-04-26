import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Link } from 'preact-router';
import { Text } from 'preact-i18n';
import { branch, renderNothing } from 'recompose';
import cx from 'classnames';
import get from 'lodash/get';
import find from 'lodash/find';
import includes from 'lodash/includes';

import { configure } from '../../config';
import { MAIL_VIEW } from '../../constants/views';

import { setActiveAccountId } from '../../store/active-account/actions';
import { clearSelected } from '../../store/mail/actions';

import accountInfo from '../../graphql-decorators/account-info';
import withActionMutation from '../../graphql-decorators/with-action-mutation';
import { types as apiClientTypes } from '@zimbra/api-client';

import { getDataTransferJSON } from '@zimbra/util/src/data-transfer-manager';

import { callWith } from '../../lib/util';
import { findFolder } from '../../utils/folders';

import { Icon } from '@zimbra/blocks';

import Sidebar from '../sidebar';
import FolderList from '../folder-list';
import ComposeButton from '../compose-button';
import { DefaultFolderContextMenu } from '../context-menus';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import ZimletSlot from '../zimlet-slot';

import s from './style.less';
import { notify } from '../../store/notifications/actions';
import { LeftSideAdSlot } from '../ad-slots';
import { getFilteredItemsForLocalFolder } from '../../utils/local-folder';

const { ActionOps, ActionType } = apiClientTypes;

const INBOX_REGEX = /^inbox$/i;

@withMediaQuery(minWidth(screenMd))
@configure({ urlSlug: 'routes.slugs.email' })
@accountInfo()
@branch(({ account, folders }) => !folders || !account, renderNothing)
@connect(
	state => ({
		activeAccountId: get(state, 'activeAccount.id')
	}),
	{
		setActiveAccountId,
		clearSelected,
		notify
	}
)
@withActionMutation()
export default class MailSidebar extends Component {
	state = {
		accountList: []
	};

	accountSelectorList = () => {
		const { id, identities, dataSources } = this.props.account;
		const { folders } = this.props;

		const primaryIdentity = find(identities.identity, i => i.id === id);
		return [
			{
				id,
				isPrimary: true,
				title: primaryIdentity._attrs.zimbraPrefIdentityName,
				folderId: null,
				navigateTo: '/email/Inbox',
				unread: this.props.inboxFolder.unread
			},
			...dataSources.imap
				.filter(i => i.l !== get(this.props, 'inboxFolder.id'))
				.map(i => {
					const sourceFolders = get(findFolder(folders, i.l), 'folders') || [];
					const primaryFolder =
						find(sourceFolders, f => INBOX_REGEX.test(f.name)) || sourceFolders[0];

					return {
						id: i.id,
						title: i.name,
						folderId: i.l,
						failingSince: i.failingSince,
						lastError: get(i, 'lastError._content'),
						navigateTo: primaryFolder
							? `/email/${encodeURIComponent(
									get(primaryFolder, 'absFolderPath', '').replace('/', '')
							  )}`
							: null,
						unread: get(primaryFolder, 'unread')
					};
				})
		];
	};

	foldersForAccount = accounts => {
		const { activeAccountId } = this.props;
		const { folders } = this.props;
		const activeAccount = find(accounts, ['id', activeAccountId]);
		if (!activeAccount) {
			return folders;
		}

		// Exclude IMAP sub-folders for the primary account
		const excludedDataSourceFolderIds = activeAccount.isPrimary
			? accounts.filter(a => a.id !== activeAccountId).map(a => a.folderId)
			: [];

		// Return the filtered folder list for the primary account, or the root
		// folder for the IMAP account
		return activeAccount.isPrimary
			? folders.filter(f => !includes(excludedDataSourceFolderIds, f.id.toString()))
			: get(findFolder(folders, activeAccount.folderId), 'folders') || [];
	};

	// Multi-account support is enabled when the user has a primary account and
	// at least one IMAP account that is synced to an account folder (not the Inbox)
	enableAccountSelector = () =>
		(get(this.props.account, 'dataSources.imap') || []).filter(
			source => source.l !== this.props.inboxFolder.id
		).length > 0;

	handleDrop = e => {
		const data = getDataTransferJSON(e);
		const folder = e.targetList;

		if (data && data.ids) {
			const {
				action: performAction,
				uploadEmails,
				isInLocalFolder,
				folder: { name: currentFolderName }
			} = this.props;

			if (isInLocalFolder) {
				const msgIdsToUpload = data.ids.map(m => m.id);
				uploadEmails(msgIdsToUpload, currentFolderName, folder.id, folder.name);
			} else if (folder.isLocalFolder) {
				const { downloadEmails, notify: notifyAction } = this.props;
				const {
					msgIdsToDownload,
					msgIdsToBeDeletedFromSource,
					convIdsToBeDeletedFromSource
				} = getFilteredItemsForLocalFolder(data.ids, data.type);

				if (!msgIdsToDownload) {
					notifyAction({
						message: <Text id="local_folder.movedSuccessfuly.none" />
					});
					return;
				}

				msgIdsToDownload &&
					downloadEmails(msgIdsToDownload, folder.name).then(() => {
						const deleteMailItemPromises = [
							msgIdsToBeDeletedFromSource &&
								performAction({
									removeFromList: true,
									type: ActionType.message,
									ids: msgIdsToBeDeletedFromSource,
									op: ActionOps.delete,
									folderId: folder.id
								}),
							convIdsToBeDeletedFromSource &&
								performAction({
									removeFromList: true,
									type: ActionType.conversation,
									ids: convIdsToBeDeletedFromSource,
									op: ActionOps.delete,
									folderId: folder.id
								})
						];

						Promise.all(deleteMailItemPromises).then(() => {
							notifyAction({
								message: (
									<Text
										id="local_folder.movedSuccessfuly"
										plural={msgIdsToDownload.length}
										fields={{ folder: folder.name, count: msgIdsToDownload.length }}
									/>
								)
							});
						});
					});
			} else {
				performAction({
					removeFromList: true,
					type: ActionType[data.type],
					ids: data.ids.map(d => d.id),
					op: ActionOps.move,
					folderId: folder.id
				});
			}
		}

		this.props.clearSelected();
		this.props.onClearSelection();
	};

	handleSelectAccount = account => {
		if (!account.navigateTo) {
			return;
		}

		this.props.setActiveAccountId(account.id);
		this.props.refetchFolders();
	};

	handleSidebarScroll = e => {
		this.setState({
			isSidebarScrolled: e.target.scrollTop !== 0
		});
	};

	componentWillReceiveProps = nextProps => {
		if (nextProps.account && !nextProps.activeAccountId) {
			this.props.setActiveAccountId(nextProps.account.id);
		}
	};

	render(
		{
			account,
			activeAccountId,
			matchesMediaQuery,
			refresh,
			onIconClick,
			urlSlug,
			folders,
			smartFolders,
			refetchFolders,
			arrayOfFlags,
			clearLocalFolderCache,
			downloadEmails,
			downloadInProgress,
			deleteFolder,
			disableLocalFolderForMove
		},
		{ isSidebarScrolled }
	) {
		if (!account || !folders || folders.length === 0) {
			return <Sidebar header={false} />;
		}

		const enableAccountSelector = this.enableAccountSelector();
		const accounts = enableAccountSelector && this.accountSelectorList();

		return (
			<Sidebar header={!matchesMediaQuery}>
				{matchesMediaQuery && (
					<div class={cx(s.composeButtonWrapper, isSidebarScrolled && s.boxShadow)}>
						<ComposeButton />
					</div>
				)}
				<div class={s.sidebarListWrapper} onscroll={this.handleSidebarScroll}>
					{enableAccountSelector && (
						<div>
							<div class={s.accountList}>
								{accounts.map(a => (
									<Link
										href={a.navigateTo}
										class={cx(
											s.account,
											a.id === activeAccountId && s.active,
											!a.navigateTo && s.failing
										)}
										onClick={callWith(this.handleSelectAccount, a)}
										disabled={!a.navigateTo}
										title={a.failingSince ? get(a, 'lastError._content') : a.title}
									>
										{a.title} {a.unread ? `(${a.unread})` : ''}
										{a.failingSince && <Icon name="warning" size="xs" class={s.warningIcon} />}
									</Link>
								))}
							</div>
							<div class={s.accountSeparator} />
						</div>
					)}
					<FolderList
						folders={enableAccountSelector ? this.foldersForAccount(accounts) : folders}
						smartFolders={smartFolders}
						refetchFolders={refetchFolders}
						indexFolderName={INBOX_REGEX}
						urlSlug={urlSlug}
						refresh={refresh}
						onIconClick={onIconClick}
						defaultContextMenu={DefaultFolderContextMenu}
						dropEffect="move"
						view={MAIL_VIEW}
						onDrop={this.handleDrop}
						collapsibleCustomGroup
						collapsibleSmartGroup
						showSmartFolders
						arrayOfFlags={arrayOfFlags}
						clearLocalFolderCache={clearLocalFolderCache}
						downloadEmails={downloadEmails}
						downloadInProgress={downloadInProgress}
						deleteFolder={deleteFolder}
						disableLocalFolderForMove={disableLocalFolderForMove}
					/>
					{matchesMediaQuery && <div class={s.accountSeparator} />}
				</div>
				<ZimletSlot name="mail-sidebar-footer" />
				<LeftSideAdSlot />
			</Sidebar>
		);
	}
}
