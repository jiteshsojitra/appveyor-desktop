import { graphql } from 'react-apollo';
import DiscoverRightsQuery from '../../graphql/queries/preferences/discover-rights.graphql';

export default function withDiscoverRights(mapProps = () => ({})) {
	return graphql(DiscoverRightsQuery, {
		props: result => ({
			delegatedRights: result.data.discoverRights,
			...mapProps(result)
		})
	});
}
