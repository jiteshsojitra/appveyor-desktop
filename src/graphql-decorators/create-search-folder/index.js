import { graphql } from 'react-apollo';
import createSearchFolder from '../../graphql/queries/folders/create-search-folder.graphql';

export function withCreateSearchFolder() {
	return graphql(createSearchFolder, {
		props: ({ mutate }) => ({
			createSearchFolder: ({ parentFolderId = 1, name, view, query }) =>
				mutate({
					variables: {
						parentFolderId,
						name,
						types: view,
						query
					}
				})
		})
	});
}
