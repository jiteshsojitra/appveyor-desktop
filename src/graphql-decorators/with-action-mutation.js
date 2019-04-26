import { graphql, compose, withApollo } from 'react-apollo';
import { connect } from 'preact-redux';
import get from 'lodash-es/get';
import { USER_FOLDER_IDS } from '../constants/';
import { doMailSort } from '../utils/search';
import ActionMutation from '../graphql/queries/action.graphql';
import SearchFragment from '../graphql/fragments/search.graphql';
import gql from 'graphql-tag';
import { optimisticAddFolderItemCount } from '../graphql/utils/graphql-optimistic';

import { types as apiClientTypes } from '@zimbra/api-client';

import { FLAGS } from '../lib/util';

const { ActionOps, ActionTypeName } = apiClientTypes;

const ConversationWithFlagsFragment = gql`
	fragment ConversationWithMessagesAndFlags on Conversation {
		id
		flags
		folderId
		... on messages {
			id
			flags
			folderId
		}
	}
`;

const MessageInfoWithFlagsFragment = gql`
	fragment MessageInfoWithFlags on MessageInfo {
		id
		flags
		folderId
	}
`;

export default function withActionMutation(options = {}) {
	return compose(
		connect(state => ({
			trashFolderId: get(state, 'trashFolder.folderInfo.id')
		})),
		withApollo,
		graphql(ActionMutation, {
			props: ({ mutate, ownProps: { trashFolderId, client } }) => ({
				action: ({ removeFromList, ...variables }) => {
					const isConversation = variables.type === ActionTypeName.ConvAction;
					const typename = isConversation ? 'Conversation' : 'MessageInfo';

					const getMailListItemFragmentOptions = id => ({
						id: `${typename}:${id}`,
						fragment: SearchFragment,
						fragmentName: `search${isConversation ? 'Conversation' : 'Message'}Fields`
					});
					const ids =
						(typeof variables.id !== 'undefined' && [variables.id]) || variables.ids || [];

					return mutate({
						context: options.context && options.context(variables),
						variables,
						optimisticResponse: {
							__typename: 'Mutation',
							action: true
						},
						update: (proxy, { data }) => {
							if (data.__typename !== 'Mutation') {
								// Only run on optimistic respones, not real response.
								return;
							}

							const fragment = isConversation
								? ConversationWithFlagsFragment
								: MessageInfoWithFlagsFragment;

							//Update Flags
							ids
								.map(id =>
									proxy.readFragment({
										id: `${typename}:${id}`,
										fragment
									})
								)
								.forEach(item => {
									if (!item) {
										return;
									}

									//write the new flags to the cache
									updateFlags({
										proxy,
										fragment,
										item,
										variables,
										trashFolderId
									});

									//update each message in a conversation as well
									(item.messages || []).forEach(m =>
										updateFlags({
											proxy,
											fragment: MessageInfoWithFlagsFragment,
											item: m,
											variables,
											trashFolderId
										})
									);
								});
						},
						updateQueries: {
							search: (prevResult, optss) => {
								// switch on `op`?
								const key = isConversation ? 'conversations' : 'messages';
								if (prevResult.search[key]) {
									if (removeFromList) {
										// Remove the item from list if the options include `removeFromList`
										prevResult.search[key] = prevResult.search[key].filter(
											result => !~ids.indexOf(result.id)
										);
									} else if (variables.op === ActionOps.move) {
										// If not removing from list and the action is a `move`, read the items
										// being moved and add them to the search results.
										// This enables optimistic undo on trash/move actions
										const mailItems = ids.map(id =>
											client.readFragment(getMailListItemFragmentOptions(id))
										);

										prevResult.search[key] = prevResult.search[key]
											.concat(mailItems)
											.sort(doMailSort.bind(null, optss.queryVariables.sortBy));
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

function updateFlags({ proxy, fragment, item, variables, trashFolderId }) {
	const { op, flags: newFlags } = variables;
	let { id, flags, __typename } = item;
	if (typeof flags !== 'string') flags = '';

	switch (op) {
		case ActionOps.read: {
			if (flags.indexOf(FLAGS.unread) !== -1) {
				flags = flags.replace(FLAGS.unread, '');

				// Decrease unread count for the parent folder
				optimisticAddFolderItemCount(proxy, { id: item.folderId }, { unread: -1 });
			}
			break;
		}
		case ActionOps.unread: {
			if (flags.indexOf(FLAGS.unread) === -1) {
				flags += FLAGS.unread;

				// Increase unread count for the parent folder
				optimisticAddFolderItemCount(proxy, { id: item.folderId }, { unread: 1 });
			}
			break;
		}
		case ActionOps.update: {
			flags = newFlags;
			break;
		}
		case ActionOps.unflag: {
			flags = flags.replace(FLAGS.flagged, '');
			break;
		}
		case ActionOps.flag: {
			if (flags.indexOf(FLAGS.flagged) === -1) {
				flags += FLAGS.flagged;
			}
			break;
		}
		case ActionOps.trash: {
			// If an unread message is being trashed, decrease the item count.
			optimisticAddFolderItemCount(
				proxy,
				{ id: item.folderId },
				{ nonFolderItemCount: -1, ...(flags.indexOf(FLAGS.unread) !== -1 && { unread: -1 }) }
			);

			item.folderId = trashFolderId || USER_FOLDER_IDS.TRASH;
			break;
		}
	}

	//If the flags changed, write the new data to the cache
	if (op === ActionOps.trash || item.flags !== flags) {
		proxy.writeFragment({
			id: `${__typename}:${id}`,
			fragment,
			data: {
				__typename,
				id,
				flags,
				folderId: item.folderId
			}
		});
	}
}
