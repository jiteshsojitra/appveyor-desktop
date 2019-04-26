import { graphql } from 'react-apollo';
import GetLocalFolderEmailsQuery from '../../graphql/queries/local-folder/get-local-folder-emails.graphql';
import GetLocalFolderEmailQuery from '../../graphql/queries/local-folder/get-local-folder-email.graphql';
import LoadLocalFolderEmailsMutation from '../../graphql/queries/local-folder/load-local-folder-emails.graphql';
import SaveLocalFolderEmailMutation from '../../graphql/queries/local-folder/save-local-folder-emails.graphql';
import UpdateLocalFolderEmailAttachmentPathMutation from '../../graphql/queries/local-folder/update-local-folder-email-attachment-path.graphql';
import get from 'lodash/get';

export function withLoadLocalFolderEmails() {
	return graphql(LoadLocalFolderEmailsMutation, {
		props: ({ mutate }) => ({
			loadLocalFolderEmails: ({ accountName, dataDirPath, name }) =>
				mutate({
					variables: {
						accountName,
						dataDirPath,
						name
					}
				})
		})
	});
}

export function withSaveLocalFolderEmails() {
	return graphql(SaveLocalFolderEmailMutation, {
		props: ({ mutate }) => ({
			saveLocalFolderEmails: ({ accountName, dataDirPath, name, data }) =>
				mutate({
					variables: {
						accountName,
						dataDirPath,
						name,
						data
					},
					fetchPolicy: 'no-cache'
				})
		})
	});
}

export function withGetLocalFolderEmails(options) {
	return graphql(GetLocalFolderEmailsQuery, {
		...options,
		props: ({ data }) => {
			const localEmails = get(data, 'localFolderEmails');
			return {
				localFolderEmails: localEmails && localEmails.length > 0 && [].concat(localEmails),
				localFolderEmailsRefetch: data.refetch
			};
		}
	});
}

export function withGetLocalFolderEmail(input) {
	return graphql(GetLocalFolderEmailQuery, {
		...input,
		props: ({ data }) => ({
			localFolderEmail: data.localFolderEmail,
			localFolderEmailRefetch: data.refetch
		})
	});
}

export function withUpdateLocalFolderEmailAttachmentPath() {
	return graphql(UpdateLocalFolderEmailAttachmentPathMutation, {
		props: ({ mutate }) => ({
			updateLocalFolderEmailAttachmentPath: ({ id, accountName, folderPath, folderName }) =>
				mutate({
					variables: {
						id,
						accountName,
						folderPath,
						folderName
					},
					fetchPolicy: 'no-cache'
				})
		})
	});
}
