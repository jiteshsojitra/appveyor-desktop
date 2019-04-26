import { h, Component } from 'preact';
import { graphql, compose } from 'react-apollo';
import { findFolderByName } from '../../utils/folders';
import CreateFolderMutation from '../../graphql/queries/folders/create-folder.graphql';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';

export default function withCreateFolderMutation() {
	// TODO: Refetch `getFolder` query?
	return graphql(CreateFolderMutation, {
		props: ({ mutate }) => ({ createFolder: mutate })
	});
}

export function guarenteeFolderExists({ folderName, options = {} }) {
	return compose(
		withCreateFolderMutation(),
		Child =>
			class WithOutboxWrapper extends Component {
				componentWillMount() {
					let folder;

					try {
						// Safely read the cache to check if the folder exists already
						folder = findFolderByName(
							this.context.client.readQuery({
								query: GetFolder,
								variables: {
									view: null
								}
							}),
							folderName
						);
					} catch (e) {}

					if (!folder) {
						this.props.createFolder({
							variables: {
								name: folderName,
								fetchIfExists: true,
								parentFolderId: 1,
								view: 'message',
								...options
							}
						});
					}
				}

				render(props) {
					return <Child {...props} />;
				}
			}
	);
}
