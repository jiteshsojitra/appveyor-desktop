import { graphql, compose, withApollo } from 'react-apollo';
import { isValidEmail, removeFlag, addFlag } from '../../lib/util';
import { ensureTextExcerpt } from '../../lib/html-email';
import { withProps } from 'recompose';
import { route } from 'preact-router';
import partition from 'lodash-es/partition';
import get from 'lodash-es/get';
import pickBy from 'lodash-es/pickBy';
import identity from 'lodash-es/identity';
import { isOfflineId, generateOfflineId } from '../../utils/offline';
import {
	optimisticAddToFolder,
	optimisticRemoveFromFolder,
	optimisticWriteMessage,
	findFolderInCache
} from '../../graphql/utils/graphql-optimistic';
import SearchQuery from '../../graphql/queries/search/search.graphql';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';
import SendMessageMutation from '../../graphql/queries/send-message-mutation.graphql';
import MessageQuery from '../../graphql/queries/message.graphql';
import SaveDraftMutation from '../../graphql/queries/save-draft-mutation.graphql';
import { OUTBOX, DRAFTS } from '../../constants/folders';
import { USER_FOLDER_IDS } from '../../constants';
import { types as apiClientTypes } from '@zimbra/api-client';
import { downloadMessage } from '../../graphql/queries/smime/download-message.graphql';
import { isSMIMEMessage } from '../../utils/mail-item';
const { MessageFlags } = apiClientTypes;

function collapseAddresses(list, type) {
	if (!list) {
		return [];
	}
	const out = [];
	for (let i = 0; i < list.length; i++) {
		const sender = list[i];

		// Skip invalid senders.
		if (isValidEmail(sender.email || sender.address)) {
			out.push({
				address: sender.email || sender.address,
				name: sender.name,
				type: type[0] // @TODO verify this is t/f/b/c
			});
		}
	}
	return out;
}

function formatAttachment({ __typename, ...attachment }, contentDisposition = 'attachment') {
	let { contentId, attachmentId, messageId, draftId } = attachment;
	messageId = messageId || draftId;

	if (attachmentId) {
		return {
			contentDisposition,
			contentId,
			attachments: { attachmentId }
		};
	}

	if (messageId) {
		return {
			contentId,
			attachments: {
				existingAttachments: [
					{
						messageId,
						part: attachment.part
					}
				]
			}
		};
	}

	return { ...attachment, contentDisposition };
}

// TODO: Move this into the api-client
export function convertMessageToZimbra(message, { requestReadReceipt } = {}) {
	let {
		id,
		folderId,
		inReplyTo,
		attachmentId,
		entityId,
		from,
		sender,
		to,
		cc,
		bcc,
		subject,
		flags,
		origId,
		draftId,
		replyType,
		attachments,
		autoSendTime
	} = message;

	if (isOfflineId(draftId) || isOfflineId(id)) {
		// Never send offlineIds to the server
		id = draftId = null;
	}

	const fromData = collapseAddresses(from, 'from');
	const senderData = collapseAddresses(sender, 'sender');

	if (requestReadReceipt) {
		fromData.push({
			...fromData[0],
			type: 'n'
		});
	}

	const out = {
		id,
		origId,
		folderId,
		attachmentId,
		replyType,
		inReplyTo,
		flags,
		autoSendTime,
		draftId,
		entityId,
		subject,
		emailAddresses: [
			...collapseAddresses(to, 'to'),
			...collapseAddresses(cc, 'cc'),
			...collapseAddresses(bcc, 'bcc'),
			...senderData,
			...fromData
		]
	};

	// remove attachments, inlineAttachments and mimeParts when message is already uploaded (i.e. in case of sign/sign and encrypt message)
	if (attachmentId) {
		return out;
	}

	out.mimeParts = buildMimeParts(message);

	if (!isSMIMEMessage(message)) {
		delete message.inlineAttachments;
	}

	if (attachments && attachments.length) {
		const [withAttachmentIds = [], withoutAttachmentId = []] = partition(
			attachments,
			'attachmentId'
		);

		out.attachments = {
			existingAttachments: withoutAttachmentId.map(({ part, messageId }) => ({
				part,
				messageId: messageId || id
			})),
			...(withAttachmentIds.length && {
				attachmentId: withAttachmentIds.map(attachment => attachment.attachmentId).join(',')
			})
		};
	}

	if (message.inlineAttachments && message.inlineAttachments.length) {
		out.inlineAttachments = [...message.inlineAttachments];
	}
	return out;
}

export function withDelayedSendMessage({ name = 'sendMessageWithDelay' } = {}) {
	return compose(
		withSaveDraft({ name }),
		withProps(props => ({
			[name]: (message, delay, requestReadReceipt) =>
				props[name](
					{
						...message,
						autoSendTime: Date.now() + delay
					},
					null,
					requestReadReceipt
				)
		}))
	);
}

export function withSaveDraft({ name = 'saveDraft', context, update } = {}) {
	return graphql(SaveDraftMutation, {
		props: ({ mutate }) => ({
			[name]: (message, base64Message, requestReadReceipt) => {
				if (!message.id && message.draftId) {
					message.id = message.draftId;
				}

				return mutate({
					context: {
						offlineQueueName: `saveDraft:${message.id}`,
						cancelQueues: `sendMessage:${message.id}`,
						...(typeof context === 'function' ? context(message) : context)
					},
					variables: {
						message: convertMessageToZimbra(message, { requestReadReceipt })
					},
					optimisticResponse: {
						saveDraft: {
							__typename: 'Mutation',
							message: createOptimisticMessageInfo({
								...message,
								flags: MessageFlags.draft,
								date: new Date()
							})
						}
					},
					...(message.draftId && {
						refetchQueries: [
							{
								query: SearchQuery,
								variables: {
									types: 'message',
									limit: 50,
									query: `in:"${DRAFTS}"`,
									recip: 2,
									sortBy: 'dateDesc', // TODO: Support non-default sort
									fullConversation: true
								}
							}
						]
					}),
					update: (cache, { data: { saveDraft } }) => {
						if (saveDraft.__typename !== 'Mutation') {
							const id = get(saveDraft, 'message.0.id');
							base64Message &&
								cache.writeQuery({
									query: downloadMessage,
									variables: {
										id
									},
									data: {
										downloadMessage: {
											id,
											content: base64Message,
											__typename: 'SMimeMessage'
										}
									}
								});

							if (isOfflineId(message.id)) {
								// When an active draft is saved with an offline ID, reroute to the real ID.
								const { pathname } = window.location;
								const newId = get(saveDraft, 'message[0].id');
								if (pathname && ~pathname.indexOf(message.id) && newId) {
									route(pathname.replace(message.id, newId), true);
								}
							}
							return;
						}

						const outbox = findFolderInCache(cache, folder => folder.name === OUTBOX);
						if (!outbox) {
							return;
						}

						const messageInfo = saveDraft.message;
						if (!messageInfo.folderId) {
							messageInfo.folderId = USER_FOLDER_IDS.DRAFTS;
						}

						if (messageInfo.autoSendTime) {
							// TODO: If offline undo send becomes too complex, disable it entirely while offline.
							messageInfo.flags = removeFlag(
								addFlag(messageInfo.flags, MessageFlags.unread),
								MessageFlags.draft
							);
							messageInfo.folderId = outbox.id;
						}

						try {
							// Check if the message has already been written to cache
							cache.readQuery({
								query: MessageQuery,
								variables: {
									id: messageInfo.draftId
								}
							});
						} catch (e) {
							// If message is not in cache, add it. If a draft has `autoSendTime`,
							// consider it as sent and put it in the Outbox.
							optimisticAddToFolder(
								cache,
								messageInfo.autoSendTime
									? OUTBOX
									: messageInfo.folderId
									? { id: messageInfo.folderId }
									: DRAFTS,
								messageInfo
							);
						}
						optimisticWriteMessage(cache, messageInfo);

						if (update && update.after) {
							update.after(cache, { data: { saveDraft } });
						}
					}
				});
			}
		})
	});
}

export function withUpdateDraftsById({ name = 'updateDraftsById' } = {}) {
	return compose(
		withSaveDraft(),
		withApollo,
		withProps(props => ({
			[name]: (ids, nextAttributes) =>
				Promise.all(
					ids.map(id => {
						try {
							const { message } = props.client.readQuery({
								query: MessageQuery,
								variables: {
									id
								}
							});

							delete message.__typename;

							return props.saveDraft({
								...message,
								...nextAttributes
							});
						} catch (e) {
							console.error('Could not find message to save as draft:', id);
						}
					})
				)
		}))
	);
}

export function withClearAutoSend({ name = 'clearAutoSend' } = {}) {
	return graphql(SaveDraftMutation, {
		props: ({ mutate }) => ({
			[name]: message => {
				// When a message is saved, use it's draftId
				// When a draft is re-saved, it already has an ID
				if (message.draftId) {
					message.id = message.draftId;
				}

				return mutate({
					context: {
						offlineQueueName: `saveDraft:${message.id}`
					},
					variables: {
						message: convertMessageToZimbra({
							...message,
							autoSendTime: null
						})
					}
				});
			}
		})
	});
}

function mapToEmailAddress(type = null) {
	return ({ address = null, displayName = null, name = null, ...rest }) => ({
		__typename: 'EmailAddress',
		address,
		name,
		displayName: displayName || name,
		type,
		...rest
	});
}

function buildMimePartBody(contentType, content) {
	return {
		body: null,
		content,
		contentDisposition: null,
		contentId: null,
		contentType,
		filename: null,
		messageId: null,
		mimeParts: null,
		part: null,
		size: null,
		url: null
	};
}

function buildMimeParts(message, addTypename) {
	const { html, text, inlineAttachments } = message;

	const mimeParts = [];

	const textPart = buildMimePartBody('text/plain', text || '');

	const htmlPart = buildMimePartBody('text/html', html || '');

	if (addTypename) {
		textPart.__typename = htmlPart.__typename = 'MimePart';
	}

	if (html && text) {
		// if we have HTML, put the `text` & `html` parts into an `alternative` part
		// with the text part first but the html part flagged as body.
		htmlPart.body = true;
		mimeParts.push({
			...buildMimePartBody('multipart/alternative', null),
			...(addTypename && { __typename: 'MimePart' }),
			mimeParts: [textPart, htmlPart]
		});
	} else {
		// otherwise there is no need for a `related` part, we just drop `text`
		// into `alternative` or `mixed` (depending if there are attachments).
		const part = html ? htmlPart : textPart;
		part.body = true;
		mimeParts.push({
			...part
		});
	}

	// If there are inline attachments; then create a `multipart/related` part
	// and append the `text/html` part and all inline attachment mimeParts to it.
	if (
		inlineAttachments &&
		inlineAttachments.length &&
		get(mimeParts, '0.mimeParts.1') === htmlPart
	) {
		mimeParts[0].mimeParts[1] = {
			...buildMimePartBody('multipart/related', null),
			...(addTypename && { __typename: 'MimePart' }),
			mimeParts: [
				htmlPart,
				...inlineAttachments.map(attachment => ({
					...buildMimePartBody(null, null),
					...pickBy(formatAttachment(attachment, 'inline'), identity),
					...(addTypename && { __typename: 'MimePart' })
				}))
			]
		};
	}
	return mimeParts;
}

// TODO: Can this be imported from @zimbra/api-client?
const emptyMessageInfo = {
	__typename: 'MessageInfo',
	id: null,
	origId: null,
	size: null,
	date: null,
	folderId: null,
	subject: null,
	emailAddresses: null,
	excerpt: null,
	conversationId: null,
	flags: null,
	tags: null,
	tagNames: null,
	revision: null,
	changeDate: null,
	modifiedSequence: null,
	invitations: null,
	sortField: null,
	mimeParts: null,
	to: null,
	from: null,
	cc: null,
	bcc: null,
	sender: null,
	html: null,
	text: null,
	attachments: null,
	inlineAttachments: null,
	share: null,
	replyType: null,
	attributes: null
};

/**
 * Change all values of undefined in an object to null.
 * Needed to tell graphql that fields are intentionally blank.
 */
function fillUndefinedWithNull(obj) {
	return Object.keys(obj).reduce(
		(acc, key) => ({
			...acc,
			[key]: typeof obj[key] === 'undefined' ? null : obj[key]
		}),
		{}
	);
}

/**
 * Given a message from the client, return a message as the server would
 */
export function createOptimisticMessageInfo(message) {
	const tos = message.to && message.to.map(mapToEmailAddress('t'));
	const froms = message.from && message.from.map(mapToEmailAddress('f'));
	const senders = message.sender && message.sender.map(mapToEmailAddress('s'));
	const ccs = message.cc && message.cc.map(mapToEmailAddress('c'));
	const bccs = message.bcc && message.bcc.map(mapToEmailAddress('b'));
	const excerpt = ensureTextExcerpt(message.html || message.text);
	const emailAddresses = [...tos, ...froms];

	if (ccs) {
		emailAddresses.push(ccs);
	}
	if (bccs) {
		emailAddresses.push(bccs);
	}
	if (senders) {
		emailAddresses.push(senders);
	}

	let { flags, date = null } = message;
	flags = MessageFlags.sentByMe + (flags || '');

	if (message.attachments && message.attachments.length) {
		flags += MessageFlags.hasAttachment;
		message.attachments = message.attachments.map(attachment => ({
			...buildMimePartBody(null, null),
			...pickBy(attachment, identity),
			__typename: 'MimePart'
		}));
	}

	if (message.inlineAttachments && message.inlineAttachments.length) {
		if (flags.indexOf(MessageFlags.hasAttachment) === -1) {
			flags += MessageFlags.hasAttachment;
		}
		message.inlineAttachments = message.inlineAttachments.map(attachment => ({
			...buildMimePartBody(null, null),
			...pickBy(formatAttachment(attachment, 'inline'), identity),
			__typename: 'MimePart'
		}));
	}

	const messageToReturn = {
		__typename: 'MessageInfo',
		...emptyMessageInfo,
		...message,
		flags,
		mimeParts: buildMimeParts(message, true),
		excerpt,
		conversationId: `-${message.id}`,
		date,
		from: froms,
		sender: senders,
		to: tos,
		cc: ccs,
		bcc: bccs,
		emailAddresses
	};

	// remove attachments, inlineAttachments and mimeParts when message is alredy uploaded (i.e. in case of sign/sign and enctrypt message)
	if (message.attachmentId) {
		messageToReturn.attachments = null;
		messageToReturn.mimeParts = null;
		messageToReturn.inlineAttachments = null;
	}

	return fillUndefinedWithNull(messageToReturn);
}

export function withSendMessage() {
	return graphql(SendMessageMutation, {
		props: ({ mutate }) => ({
			sendMessage: (message, requestReadReceipt) => {
				if (!message.draftId) {
					message.draftId = generateOfflineId();
				}

				return mutate({
					context: {
						offlineQueueName: `sendMessage:${message.draftId}`,
						// Cancel any outstanding `saveDraft` requests
						cancelQueues: `saveDraft:${message.draftId}`
					},
					variables: {
						message: convertMessageToZimbra(message, { requestReadReceipt })
					},
					refetchQueries: [
						{ query: GetFolder, variables: { view: null } },
						...(message.draftId && {
							query: SearchQuery,
							variables: {
								types: 'message',
								limit: 50,
								query: `in:"${DRAFTS}"`,
								recip: 2,
								sortBy: 'dateDesc', // TODO: Support non-default sort
								fullConversation: true
							}
						})
					],

					optimisticResponse: {
						sendMessage: {
							__typename: 'Mutation',
							message: {
								__typename: 'MsgWithGroupInfo',
								id: message.draftId
							}
						}
					},
					update: (cache, { data }) => {
						if (data.sendMessage.__typename !== 'Mutation') {
							try {
								// Check for existing message in cache
								const cachedMessage = cache.readQuery({
									query: MessageQuery,
									variables: {
										id: message.draftId
									}
								}).message;

								optimisticRemoveFromFolder(cache, OUTBOX, cachedMessage);
							} catch (e) {}

							return;
						}

						// When offline mode is enabled messages are optimistically placed in the outbox
						const outbox = findFolderInCache(cache, folder => folder.name === OUTBOX);

						if (!outbox) {
							// If the outbox does not exist, offline mode is disabled so do nothing.
							return;
						}

						const messageInfo = createOptimisticMessageInfo({
							...message,
							flags: removeFlag(message.flags, MessageFlags.draft) + MessageFlags.unread,
							id: data.sendMessage.message.id,
							folderId: outbox.id,
							date: new Date()
						});

						let cachedMessage = {};
						try {
							// Check for existing message in cache
							cachedMessage = cache.readQuery({
								query: MessageQuery,
								variables: {
									id: messageInfo.draftId
								}
							}).message;
						} catch (e) {}

						// 1. if there message is not already in outbox, add it.
						if (cachedMessage.folderId !== outbox.id) {
							optimisticAddToFolder(cache, OUTBOX, messageInfo);
						}

						// 2. always write message to MessageQuery
						optimisticWriteMessage(cache, messageInfo);

						// 3. Remove message from drafts folder search results
						if (
							cachedMessage.flags &&
							~cachedMessage.flags.indexOf(MessageFlags.draft) &&
							cachedMessage.folderId !== outbox.id
						) {
							optimisticRemoveFromFolder(
								cache,
								cachedMessage.folderId ? { id: cachedMessage.folderId } : DRAFTS,
								messageInfo
							);
						}
					}
				});
			}
		})
	});
}
