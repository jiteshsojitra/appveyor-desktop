import { h, Component } from 'preact';
import { route } from 'preact-router';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import queryString from 'query-string';
import get from 'lodash-es/get';
import { uriSegment } from '../../lib/util';

import {
	getView,
	getSearchFolder,
	getSearchQuery,
	getSearchEmail
} from '../../store/url/selectors';

import SearchInput from '../search-input';
import ActionMenuSearchFolder from '../action-menu-search-folder';
import getMailFolders from '../../graphql-decorators/get-mail-folders';
import accountInfo from '../../graphql-decorators/account-info';
import search from '../../graphql-decorators/search';
import { setShowAdvanced } from '../../store/navigation/actions';
import { setActiveSearch } from '../../store/search/actions';
import { getQueryOptions } from '../../utils/search';
import s from './style.less';

const VIEW_TO_SEARCH = {
	conversation: 'email',
	message: 'email'
};

@getMailFolders()
@connect(
	state => ({
		query: getSearchQuery(state),
		email: getSearchEmail(state),
		currentView: getView(state),
		overrideGroupMailBy: state.url.routeProps.types,
		folder: getSearchFolder(state),
		activeSearchFolder: state.search.activeFolder
	}),
	{
		setShowAdvanced,
		setActiveSearch
	}
)
@search({
	skip: ({ email }) => !email,
	options: ({ email }) => ({
		variables: {
			limit: 1,
			needExp: true,
			query: `contact:${email}`,
			types: 'contact'
		}
	}),
	props: ({ data }) => ({
		contacts: (!data.loading && data.search && data.search.contacts) || []
	})
})
@accountInfo(({ data: { accountInfo: account } }) => ({
	groupMailBy: account && account.prefs && account.prefs.zimbraPrefGroupMailBy
}))
export default class Search extends Component {
	state = {
		focused: false,
		folderToSearch: this.props.folder,
		showAdvanced: false,
		query: '',
		queryOptions: null
	};

	handleSubmit = (query, email) => {
		const { localSearch, currentView, overrideGroupMailBy, groupMailBy } = this.props;

		if (!localSearch) {
			route(
				`/search/${VIEW_TO_SEARCH[currentView] || currentView}/?${queryString.stringify({
					q: query || undefined,
					e: email || undefined,
					types:
						currentView === 'calendar'
							? 'appointment,task'
							: overrideGroupMailBy || groupMailBy || 'conversation',
					folder: this.state.folderToSearch || undefined
				})}`
			);
		} else {
			this.handleSearchValueChange(query);
		}
	};

	handleSearchValueChange = query => {
		this.setState({ query });
	};

	handleFocus = () => {
		this.setState({ focused: true });
	};

	handleBlur = () => {
		this.setState({ focused: false });
	};

	handleFolderChange = name => {
		this.setState({ folderToSearch: name });
		if (this.props.query) this.handleSubmit(this.props.query, this.props.email);
	};

	handleShowAdvanced = () => {
		this.props.setShowAdvanced({ show: true });
		this.setState({ showAdvanced: true });
	};

	handleHideAdvanced = () => {
		this.props.setShowAdvanced({ show: false });
		this.setState({ showAdvanced: false });
		this.props.activeSearchFolder && this.setState({ query: undefined, queryOptions: null });
		this.props.setActiveSearch(null);
	};

	getPathType = () => {
		const baseSegment = uriSegment(window.location.pathname);

		const pathType =
			baseSegment === 'search' ? uriSegment(window.location.pathname, 1) : baseSegment;

		return pathType;
	};

	setAdvanceSearchOptions = activeSearchFolder => {
		const queryOptions = getQueryOptions(activeSearchFolder.query);
		queryOptions && this.setState({ queryOptions });
		queryOptions.activeFolder && this.setState({ folderToSearch: queryOptions.activeFolder });
	};

	componentWillMount() {
		const { activeSearchFolder, showAdvanced } = this.props;
		activeSearchFolder && showAdvanced && this.setAdvanceSearchOptions(activeSearchFolder);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.activeSearchFolder) {
			this.setAdvanceSearchOptions(nextProps.activeSearchFolder);
		} else if (this.props.activeSearchFolder) {
			// clear the active search if there was one before
			this.setState({
				folderToSearch: undefined,
				query: undefined,
				queryOptions: null
			});
		}
	}

	render(
		{
			query,
			email,
			contacts,
			currentView,
			folders,
			showDropDown,
			searchInline,
			searchScreen,
			hideClearButton,
			autofocus,
			activeSearchFolder,
			localSearch
		},
		{ focused, showAdvanced, folderToSearch, queryOptions }
	) {
		const pathType = this.getPathType();
		query = query || this.state.query;

		return (
			<div
				className={cx(
					s.searchContainer,
					!searchInline && s.headerSearch,
					searchScreen && s.searchScreen
				)}
			>
				<div className={s.search}>
					<div className={cx(s.searchControl, focused && s.focus, searchInline && s.sectionSearch)}>
						{currentView === 'email' && showDropDown && !showAdvanced && (
							<ActionMenuSearchFolder
								folders={folders}
								label={folderToSearch || <Text id="search.allMail" />}
								onSearchFolderChanged={this.handleFolderChange}
								onAdvancedSearch={this.handleShowAdvanced}
								searchInline={searchInline}
							/>
						)}

						<SearchInput
							autofocus={autofocus}
							pathType={pathType}
							value={query}
							email={email}
							contact={get(contacts, '0')}
							onSubmit={this.handleSubmit}
							onFocus={this.handleFocus}
							onBlur={this.handleBlur}
							onHideAdvanced={this.handleHideAdvanced}
							searchInline={searchInline}
							hideClearButton={hideClearButton}
							localSearch={localSearch}
							dispatch={this.props.dispatch}
							handleSearchValueChange={this.handleSearchValueChange}
							queryOptions={queryOptions}
							activeSearchFolder={activeSearchFolder}
							disableContactSuggestions={(VIEW_TO_SEARCH[currentView] || currentView) !== 'email'}
						/>
					</div>
				</div>
			</div>
		);
	}
}
