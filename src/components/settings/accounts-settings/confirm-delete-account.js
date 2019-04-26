import { h } from 'preact';
import { Text } from 'preact-i18n';
import { graphql, compose } from 'react-apollo';
import { Button } from '@zimbra/blocks';
import get from 'lodash-es/get';
import { callWith } from '../../../lib/util';
import DeleteExternalAccountMutation from '../../../graphql/queries/accounts/account-delete-external-mutation.graphql';
import { FolderActionMutation } from '../../../graphql/queries/folders/folders.graphql';
import GetFolder from '../../../graphql/queries/folders/get-folder.graphql';
import style from '../style';

const ConfirmDeleteAccountView = ({ id, accountName, deleteExternalAccount, switchView }) => (
	<div>
		<p class={style.confirmationMessage}>
			<Text
				id="settings.accounts.editAccount.confirmation"
				fields={{
					accountName
				}}
			/>
		</p>
		<p class={style.confirmationSpan}>
			<Text id="settings.accounts.editAccount.additionalConfirmationInfo" />
		</p>
		<div>
			<Button
				styleType="primary"
				brand="danger"
				onClick={callWith(deleteExternalAccount, { id })}
				alignLeft
			>
				<Text id="buttons.removeMailbox" />
			</Button>
			<Button onClick={callWith(switchView, ['edit'])}>
				<Text id="buttons.cancel" />
			</Button>
		</div>
	</div>
);

export default compose(
	graphql(FolderActionMutation, {
		props: ({ mutate }) => ({
			/**
			 * On delete POP3 external account, delete folder from `Folders` list as well
			 */
			folderAction: folderId => {
				mutate({
					variables: {
						action: {
							op: 'delete',
							id: folderId
						}
					},
					optimisticResponse: {
						__typename: 'Mutation',
						folderAction: true
					},
					update: (cache, { data }) => {
						if (data.__typename !== 'Mutation') return;

						/**
						 * Get existing folder list and optimistically update folder
						 * list after deleting the account folder
						 */
						let cachedFolders;
						try {
							cachedFolders = cache.readQuery({
								query: GetFolder,
								variables: {
									view: null
								}
							});
						} catch (error) {
							console.error({ error });
						}

						if (!cachedFolders) return;

						const existingFolders = get(cachedFolders, 'getFolder.folders.0.folders');
						const deletedFolderIndex = existingFolders.findIndex(folder => folder.id === folderId);

						if (deletedFolderIndex === -1) return;

						existingFolders.splice(deletedFolderIndex, 1);
						cache.writeQuery({
							query: GetFolder,
							variables: {
								view: null
							},
							data: cachedFolders
						});
					}
				});
			}
		})
	}),
	graphql(DeleteExternalAccountMutation, {
		props: ({
			mutate,
			ownProps: { switchView, accountInfoQuery, folderAction, accountType, folderId }
		}) => ({
			deleteExternalAccount: ({ id }) => {
				mutate({
					variables: {
						id
					}
				}).then(() => {
					accountType === 'pop3' && folderAction(folderId);
					accountInfoQuery.refetch();
					switchView(['active']);
				});
			}
		})
	})
)(ConfirmDeleteAccountView);
