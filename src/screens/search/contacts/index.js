import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { defaultProps } from 'recompose';
import get from 'lodash-es/get';
import { configure } from '../../../config';
import { DEFAULT_SORT, DEFAULT_LIMIT, SEARCH_TYPE } from '../../../constants/search';
import { getSearchQuery, getSearchEmail } from '../../../store/url/selectors';
import Contacts from '../../../components/contacts';
import { pruneEmpty } from '../../../utils/filter';
import withAccountInfo from '../../../graphql-decorators/account-info';
import withSearch from '../../../graphql-decorators/search';
import withMediaQuery from '../../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../../constants/breakpoints';
import registerTab from '../../../enhancers/register-tab';
import Fill from '../../../components/fill';
import SearchToolbar from '../../../components/search-toolbar';

@configure('routes.slugs', { searchInline: 'searchInline' })
@defaultProps({
	limit: DEFAULT_LIMIT,
	sortBy: DEFAULT_SORT
})
@connect(state => ({
	query: getSearchQuery(state),
	email: getSearchEmail(state),
	view: state.url.view
}))
@withAccountInfo()
@withSearch({
	skip: ({ account }) => !account,
	options: ({ q, email, limit, sortBy }) => {
		const searchString = [q, email].filter(Boolean).join(' ');
		const query = `#email:"*${searchString}*" OR #firstname:"*${searchString}*" OR #lastname:"*${searchString}*"`;

		return {
			variables: {
				types: 'contact',
				limit,
				recip: 2,
				sortBy,
				query,
				needExp: true
			}
		};
	},
	props: ({ data: { search } }) => {
		const contacts = get(search, 'contacts') || [];

		return {
			contacts: contacts.map(contact => pruneEmpty(contact))
		};
	}
})
@registerTab(({ query }) => ({
	type: 'search',
	id: 'search',
	title: `Search Results - "${query}"`
}))
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export default class ContactSearch extends Component {
	render({ searchInline, contacts, limit, types, query, email, matchesScreenMd, refetchFolders }) {
		return (
			<Fill>
				<SearchToolbar
					items={contacts}
					limit={limit}
					view={types}
					query={query}
					matchesScreenMd={matchesScreenMd}
					handleSetPane={this.setSelectedPane}
					searchInline={searchInline}
					email={email}
					refetchFolders={refetchFolders}
					searchType={SEARCH_TYPE.contacts}
				/>
				<Contacts searchResults={contacts} />
			</Fill>
		);
	}
}
