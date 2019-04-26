import { graphql } from 'react-apollo';
import get from 'lodash-es/get';
import find from 'lodash-es/find';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';
import { USER_FOLDER_IDS } from '../../constants';
import { CONTACTS_VIEW } from '../../constants/views';

export default function withGetContactFolders(_config = {}) {
	return graphql(GetFolder, {
		options: {
			variables: {
				view: CONTACTS_VIEW
			}
		},
		props: ({ data: { getFolder, refetch: refetchContactFolders } }) => {
			const folders = get(getFolder, 'folders.0.folders');
			return {
				folders,
				defaultContactFolder: find(
					folders,
					folder => parseInt(folder.id, 10) === USER_FOLDER_IDS.CONTACTS
				),
				refetchContactFolders
			};
		},
		..._config
	});
}
