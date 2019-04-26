import { graphql, compose } from 'react-apollo';
import { connect } from 'preact-redux';
import { USER_FOLDER_IDS } from '../../constants/';
import get from 'lodash-es/get';
import { action as ActionMutation } from '../../graphql/queries/action.graphql';
import { types as apiClientTypes } from '@zimbra/api-client';
const { ActionType, ActionOps } = apiClientTypes;

export default function withTrashMessage({ name = 'trashMessage' } = {}) {
	return compose(
		connect(state => ({
			trashFolderId: get(state, 'trashFolder.folderInfo.id')
		})),
		graphql(ActionMutation, {
			props: ({ mutate, ownProps: { trashFolderId } }) => ({
				[name]: message => {
					const isTrashed =
						message.folderId === trashFolderId ||
						message.folderId === USER_FOLDER_IDS.TRASH.toString();

					// If the item is already trashed, do nothing
					if (isTrashed) {
						return Promise.resolve();
					}

					return mutate({
						variables: {
							type: ActionType.message,
							op: ActionOps.trash,
							id: message.id
						},
						optimisticResponse: {
							__typename: 'Mutation',
							action: true
						},
						updateQueries: {
							search: prevResult => {
								if (!prevResult.search && prevResult.search.messages) {
									prevResult.search.messages = prevResult.search.messages.filter(
										({ id }) => id !== message.id
									);
								}

								return prevResult;
							},
							getConversation: prevResult => {
								// If trashing a message in a conversation, refetch the conversation

								if (prevResult.conversation) {
									// Do not decrease `numMessages`, a trashed message counts towards
									// conversation message count

									if (prevResult.conversation.messages) {
										// Filter out removed message
										prevResult.conversation.messages = prevResult.conversation.messages.filter(
											({ id }) => id !== message.id
										);
									}
								}
								return prevResult;
							}
						}
					});
				}
			})
		})
	);
}
