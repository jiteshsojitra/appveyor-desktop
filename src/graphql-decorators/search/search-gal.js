import { SearchGal } from '../../graphql/queries/contacts/search-gal.graphql';
import { graphql } from 'react-apollo';
import get from 'lodash/get';

export default function withSearchGal(config = {}) {
	return graphql(SearchGal, {
		props: ({ data: { searchGal } }) => ({
			galContacts: get(searchGal, 'contacts') || []
		}),
		...config
	});
}
