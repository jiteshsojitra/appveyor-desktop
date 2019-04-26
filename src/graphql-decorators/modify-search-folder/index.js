import { graphql } from 'react-apollo';
import get from 'lodash-es/get';
import find from 'lodash-es/find';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';
import modifySearchFolder from '../../graphql/queries/folders/modify-search-mutation.graphql';

export function withModifySearchFolder() {
	return graphql(modifySearchFolder, {
		props: ({ mutate }) => ({
			modifySearchFolder: ({ id, query, types }) =>
				mutate({
					variables: {
						search: {
							id,
							query,
							types
						}
					},
					optimisticResponse: {
						__typename: 'Mutation',
						modifySearchFolder: true
					},
					update(proxy) {
						const data = proxy.readQuery({
							query: GetFolder,
							variables: {
								view: null
							}
						});
						const smartFolders = get(data, 'getFolder.folders.0.search');
						const item = find(smartFolders, { id });
						item.query = query;

						proxy.writeQuery({ query: GetFolder, data });
					}
				})
		})
	});
}
