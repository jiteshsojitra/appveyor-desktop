import { h, Component } from 'preact';
import { route } from 'preact-router';
import { Text, withText } from 'preact-i18n';
import { connect } from 'preact-redux';
import { branch, defaultProps, withProps } from 'recompose';
import partition from 'lodash-es/partition';
import flatMap from 'lodash-es/flatMap';
import isEmpty from 'lodash-es/isEmpty';
import get from 'lodash-es/get';
import { configure } from '../../../config';
import { compose, withApollo } from 'react-apollo';

import { DEFAULT_SORT, DEFAULT_LIMIT, SEARCH_TYPE } from '../../../constants/search';
import { groupMailBy } from '../../../constants/user-prefs';
import {
	getSearchQuery,
	getSearchEmail,
	getSearchFolder,
	getQueryFolder
} from '../../../store/url/selectors';
import { setPreviewAttachment } from '../../../store/attachment-preview/actions';
import { doMailSort, zimbraQueryToLunrQuery, getSearchQueryString } from '../../../utils/search';
import searchFragments from '../../../graphql/fragments/search.graphql';
import accountInfo from '../../../graphql-decorators/account-info';
import search from '../../../graphql-decorators/search';
import getMailFolders from '../../../graphql-decorators/get-mail-folders';
import { getMailboxMetadata } from '../../../graphql-decorators/mailbox-metadata';
import { types as apiClientTypes } from '@zimbra/api-client';
import withMediaQuery from '../../../enhancers/with-media-query';
import withLunrIndex from '../../../enhancers/with-lunr-index';
import { minWidth, screenMd } from '../../../constants/breakpoints';

import registerTab from '../../../enhancers/register-tab';
import { updateQuery } from '../../../utils/query-params';
import saveAs from '../../../lib/save-as';
import Fill from '../../../components/fill';
import SearchErrorText from '../../../components/search-error-text';
import SearchToolbar from '../../../components/search-toolbar';
import MailSidebar from '../../../components/mail-sidebar';
import MailListFooter from '../../../components/mail-list-footer';
import MailPane from '../../../components/mail-pane';
import ContactFrequencyCard from '../../../components/contact-frequency-card';
import RelatedContactsCard from '../../../components/related-contacts-card';
import { isImageDeep } from '../../../utils/attachments';
import { getConversationFolder, findFolder } from '../../../utils/folders';
import AttachmentsPane from '../../../components/attachments-pane';
import { absoluteUrl } from '../../../lib/util';
import { MAIL_VIEW } from '../../../constants/views';

import style from './style.less';

const { MailFolderView } = apiClientTypes;

function getAttachments(messages) {
	if (!Array.isArray(messages)) return [];
	return flatMap(messages, message =>
		(message.attachments || message.inlineAttachments || []).map(attachment => ({
			attachment,
			message
		}))
	);
}

@configure('routes.slugs', { searchInline: 'searchInline' })
@accountInfo()
@defaultProps({
	limit: DEFAULT_LIMIT,
	sort: DEFAULT_SORT
})
@withProps(({ account }) => ({
	groupBy: get(account, `prefs.${groupMailBy.name}`) || groupMailBy.default
}))
@connect(
	state => ({
		query: getSearchQuery(state),
		email: getSearchEmail(state),
		folder: getSearchFolder(state),
		queryFolder: getQueryFolder(state),
		view: state.url.view,
		isOffline: state.network.isOffline
	}),
	{ preview: setPreviewAttachment }
)
@withText(({ query }) => ({
	searchTabTitle: <Text id="search.searchResults" fields={{ query }} />
}))
@getMailboxMetadata()
@getMailFolders()
@branch(
	({ isOffline }) => isOffline,
	compose(
		withLunrIndex(MAIL_VIEW),
		withApollo,
		withProps(({ client, lunrIndex, sort, ...props }) => ({
			search: {
				messages: lunrIndex
					.search(zimbraQueryToLunrQuery(getSearchQueryString(props)))
					.map(({ ref }) =>
						client.readFragment({
							id: `MessageInfo:${ref}`,
							fragment: searchFragments,
							fragmentName: 'searchMessageFields'
						})
					)
					.sort(doMailSort.bind(null, sort))
			}
		}))
	),
	search({
		skip: ({ account, ...rest }) => !account || !getSearchQueryString(rest),
		options: props => {
			const { account, sort, limit, ...rest } = props;
			const query = getSearchQueryString(rest);

			return {
				variables: {
					types: account.prefs.zimbraPrefGroupMailBy || MailFolderView.conversation,
					sortBy: sort,
					query,
					limit,
					recip: 2,
					needExp: true,
					fullConversation: true
				}
			};
		}
	})
)
@search({
	name: 'attachmentsSearch',
	skip: ({ account, query, email }) => !account || (!query && !email),
	options: ({ sort, query: q, email, folder, limit }) => {
		let query = [q, email].filter(Boolean).join(' ');
		query = folder !== 'All' && !isEmpty(folder) ? query + ` in:"${folder}"` : query;

		return {
			variables: {
				types: 'message',
				sortBy: sort,
				query: `${query} has:attachment`,
				fetch: 'all',
				limit,
				withAttachments: true
			}
		};
	}
})
@registerTab(({ searchTabTitle, queryFolder }) => ({
	type: 'search',
	id: 'search',
	title: queryFolder || searchTabTitle
}))
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export default class MailSearch extends Component {
	state = {
		selectedPane: 'Messages'
	};

	navigateToItem = e => route(`/${e.type}/${e.item.id}`);

	handleSort = sortBy => {
		route(updateQuery({ sort: sortBy }), true);
	};

	downloadAttachment = attachment => e => {
		e.stopPropagation();
		saveAs(attachment);
	};

	emailAttachment = conversationId => e => {
		e.stopPropagation();
		route(`/conversation/${conversationId}`);
	};

	togglePreviewer = ({ attachment, attachments }) =>
		this.props.preview && this.props.preview(attachment, attachments);

	setSelectedPane = selectedPane => {
		this.setState({ ...this.state, selectedPane });
		this.refetch();
	};

	refetch = () => {
		this.props.refetchSearch();
		this.props.refetchAttachmentsSearch();
	};

	urlForMessage = (id, type = this.props.viewType, full = false, print = false) => {
		let url = `/${this.props.urlSlug}/${encodeURIComponent(
			this.props.folderName
		)}/${type}/${encodeURIComponent(id)}`;

		if (print) {
			url += '/print';
		}

		if (full) {
			url += '?full=true';
		}

		return url;
	};

	routeToMailItemPrint = id => {
		const url = this.urlForMessage(id, this.props.viewType, this.props.full, true);
		window.open(absoluteUrl(url));
	};

	handlePrint = id => {
		if (isEmpty(id)) {
			this.routeToMailItemPrint(id);
		}
	};

	renderNoItemsMailPane = () => {
		const { searchError, isOffline } = this.props;
		return (
			<MailListFooter>
				{searchError ? (
					<SearchErrorText searchError={searchError} />
				) : (
					<Text id={`search.${isOffline ? 'offline.' : ''}results`} plural={0} fields={0} />
				)}
			</MailListFooter>
		);
	};

	renderNoItemsAttachmentsPane = () => {
		const { isOffline } = this.props;
		return (
			<MailListFooter>
				<Text id={`search.${isOffline ? 'offline.' : ''}results`} plural={0} fields={0} />
			</MailListFooter>
		);
	};

	renderOfflineMessage = () => (
		<div class={style.offlineMessage}>
			<Text id="search.offline.results" plural={10} />
		</div>
	);

	render(
		{
			searchInline,
			search: results,
			folders,
			searchLoading,
			searchError,
			refetchSearch,
			groupBy,
			limit,
			types,
			email,
			query,
			attachmentsSearch,
			matchesScreenMd,
			smartFolders,
			inboxFolder,
			refetchFolders
		},
		{ selectedPane }
	) {
		let items = [];
		if (results && results.conversations) {
			items = results.conversations.map(c => ({
				...c,
				folder: getConversationFolder(folders, c)
			}));
		} else if (results && results.messages) {
			items = results.messages.map(m => ({
				...m,
				folder: findFolder(folders, m.folderId)
			}));
		}
		const attachmentItems = getAttachments(get(attachmentsSearch, 'messages', []));

		const [pictureItems, documentItems] = partition(attachmentItems, isImageDeep);

		const searchQuery = getSearchQueryString(this.props);

		return (
			<Fill>
				<MailSidebar
					refresh={this.refetch}
					folders={folders}
					smartFolders={smartFolders}
					inboxFolder={inboxFolder}
					refetchFolders={refetchFolders}
					matchesScreenMd={matchesScreenMd}
				/>

				<Fill>
					<SearchToolbar
						items={items}
						more={results && results.more}
						limit={limit}
						view={types}
						query={query}
						matchesScreenMd={matchesScreenMd}
						handleSetPane={this.setSelectedPane}
						searchInline={searchInline}
						email={email}
						searchQuery={searchQuery}
						refetchFolders={refetchFolders}
						searchType={SEARCH_TYPE.mail}
					/>

					<div class={style.bodyContainer}>
						{selectedPane === 'Messages' ? (
							<div class={style.innerContainer}>
								<MailPane
									searchScreen
									openSearchBar
									listType={groupBy}
									items={!searchLoading && !searchError && items}
									pending={searchLoading}
									more={results && results.more}
									sortBy={results && results.sortBy}
									headerClass={style.searchMailHeader}
									renderNoItems={this.renderNoItemsMailPane}
									afterAction={refetchSearch}
									afterBulkDelete={refetchSearch}
									onItemClick={this.navigateToItem}
									onSort={this.handleSort}
									onPrint={this.handlePrint}
									wide={false}
									disablePreview
									disableMessageNavigation
									showFolderName
									renderOfflineMessage={this.renderOfflineMessage}
								/>

								{email && (
									<div class={style.emailSearchSidebar}>
										<ContactFrequencyCard email={email} />
										<RelatedContactsCard email={email} />
									</div>
								)}
							</div>
						) : (
							<AttachmentsPane
								items={selectedPane === 'Photos' ? pictureItems : documentItems || []}
								sortBy="date"
								groupByDate
								onDownload={this.downloadAttachment}
								onEmail={this.emailAttachment}
								onTogglePreviewer={this.togglePreviewer}
								renderNoItems={this.renderNoItemsAttachmentsPane}
								isPicturesPane={selectedPane === 'Photos'}
								renderOfflineMessage={this.renderOfflineMessage}
							/>
						)}
					</div>
				</Fill>
			</Fill>
		);
	}
}
