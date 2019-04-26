import { createOptimisticMessageInfo } from '../graphql-decorators/send-message';
import localFolderHandler from '@zimbra/electron-app/src/local-folder';
import localFolderEmailQuery from '../graphql/queries/local-folder/get-local-folder-email.graphql';
import localFolderEmailsQuery from '../graphql/queries/local-folder/get-local-folder-emails.graphql';

export const localFolderOperations = {
	loadLocalFolderEmails: 'loadLocalFolderEmails',
	localFolderEmails: 'localFolderEmails'
};

const getMessageWithUpdatedFlags = m => {
	const { flags, ...attr } = createOptimisticMessageInfo(m);
	return {
		...attr,
		flags: flags.replace('s', '')
	};
};

function writeToLocalCache(cache, messageList, folderName) {
	const messages = messageList.sort(({ date: aDate }, { date: bDate }) => {
		if (aDate && bDate) {
			if (new Date(aDate) > new Date(bDate)) return -1;
			else if (new Date(aDate) < new Date(bDate)) return 1;
			return 0;
		}
		return 1;
	});

	cache.writeQuery({
		query: localFolderEmailsQuery,
		variables: {
			folderName
		},
		data: {
			localFolderEmails: messages
		}
	});

	// This will write queries for each individuale messages into cache
	messages.forEach(message => {
		cache.writeQuery({
			query: localFolderEmailQuery,
			variables: {
				id: message.id
			},
			data: {
				localFolderEmail: message
			}
		});
	});
}

export const resolvers = {
	Mutation: {
		loadLocalFolderEmails: (_, { dataDirPath, accountName, name }, { cache }) =>
			localFolderHandler({
				operation: 'read-emails',
				folderPath: dataDirPath,
				accountName,
				name
			}).then(parsedMessages => {
				writeToLocalCache(cache, parsedMessages.map(getMessageWithUpdatedFlags), name);
				return null;
			}),
		saveLocalFolderEmails: (_, { dataDirPath, accountName, name, data }, { cache }) =>
			localFolderHandler({
				operation: 'save-file',
				folderPath: dataDirPath,
				accountName,
				name,
				data
			}).then(parsedMessages => {
				let messages = parsedMessages.map(getMessageWithUpdatedFlags);
				let cacheData;

				try {
					cacheData = cache.readQuery({
						query: localFolderEmailsQuery,
						variables: {
							folderName: name
						}
					});
				} catch (error) {}

				if (cacheData) {
					messages = cacheData.localFolderEmails.concat(messages);
				}

				writeToLocalCache(cache, messages, name);
				return null;
			}),
		updateLocalFolderEmailAttachmentPath: (
			_,
			{ id, accountName, folderPath, folderName },
			{ cache }
		) => {
			let cacheData;

			try {
				cacheData = cache.readQuery({
					query: localFolderEmailsQuery,
					variables: {
						folderName
					}
				});
			} catch (error) {}

			if (cacheData) {
				const messages = cacheData.localFolderEmails;
				const msgAttachmentPath = localFolderHandler({
					operation: 'get-msg-attachment-dir',
					accountName,
					folderPath,
					name: folderName,
					data: {
						msgId: id
					}
				});

				const message = messages.find(msg => msg.id === id);

				message.attachments = message.attachments.map(attachment => {
					attachment.url = localFolderHandler({
						operation: 'get-msg-attachment-filepath',
						data: {
							dirPath: msgAttachmentPath,
							fileName: attachment.filename
						}
					});
					return attachment;
				});

				message.inlineAttachments = message.inlineAttachments.map(attachment => {
					attachment.url = localFolderHandler({
						operation: 'get-msg-attachment-filepath',
						data: {
							dirPath: msgAttachmentPath,
							fileName: attachment.filename
						}
					});
					return attachment;
				});

				writeToLocalCache(cache, messages, folderName);
			}

			return null;
		}
	}
};
