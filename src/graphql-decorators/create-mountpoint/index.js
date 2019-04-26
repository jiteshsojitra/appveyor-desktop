import { CreateMountpoint } from '../../graphql/queries/create-mountpoint.graphql';
import { graphql } from 'react-apollo';

export default function withCreateMountpoint({ name = 'createMountpoint' } = {}) {
	return graphql(CreateMountpoint, {
		props: ({ mutate }) => ({
			[name]: link =>
				mutate({
					variables: {
						link
					}
				})
		})
	});
}
