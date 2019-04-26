import { h } from 'preact';
import { Text } from 'preact-i18n';
import { graphql, compose } from 'react-apollo';
import { FoldersQuery } from '../../../graphql/queries/tasks.graphql';
import { DEFAULT_NOTIFICATION_DURATION } from '../../../constants/notifications';
import { USER_FOLDER_IDS } from '../../../constants';

import { FolderActionMutation } from '../../../graphql/queries/folders/folders.graphql';

export function withDeleteFolder() {
	return graphql(FolderActionMutation, {
		props: ({ mutate }) => ({
			deleteFolder: id =>
				mutate({
					variables: {
						action: {
							op: 'delete',
							id
						}
					}
				})
		})
	});
}

export function withMoveFolder() {
	return graphql(FolderActionMutation, {
		props: ({ mutate }) => ({
			moveFolder: (id, folderId) =>
				mutate({
					variables: {
						action: {
							op: 'move',
							id,
							folderId
						}
					},
					refetchQueries: [
						{
							query: FoldersQuery
						}
					]
				})
		})
	});
}

export function withTrashFolder() {
	return compose(
		withDeleteFolder(),
		withMoveFolder(),
		graphql(FolderActionMutation, {
			props: ({ mutate, ownProps: { notify, deleteFolder, moveFolder, undoLabel } }) => ({
				trashFolder: id =>
					mutate({
						variables: {
							action: {
								op: 'trash',
								id
							}
						},
						optimisticResponse: {
							folderAction: true
						},
						update(store) {
							const data = store.readQuery({ query: FoldersQuery });

							// Remove the `taskFolder` that matches the ID of the folder being trashed.
							data.taskFolders = data.taskFolders.filter(folder => folder.id !== id);

							store.writeQuery({ query: FoldersQuery, data });
						},
						refetchQueries: [
							{
								query: FoldersQuery
							}
						]
					}).then(() => {
						// Delete folder permanently once user loses ability to undo operation
						const timer = setTimeout(() => {
							deleteFolder(id);
						}, DEFAULT_NOTIFICATION_DURATION * 1000);

						notify({
							message: <Text id="tasks.notifications.listDeleted" />,
							action: {
								label: undoLabel,
								fn: () => {
									// Cancel timer
									clearTimeout(timer);

									// TODO: On a slow connection, list disappears after undo until reload.
									moveFolder(id, USER_FOLDER_IDS.ROOT).then(() => {
										notify({
											message: <Text id="tasks.notifications.listRestored" />
										});
									});
								}
							}
						});
					})
			})
		})
	);
}
