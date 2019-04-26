import { USER_FOLDER_IDS } from '../constants/index';
import flatten from 'lodash-es/flatten';

export const CANNOT_MOVE_INTO_LOCALFOLDER = [
	USER_FOLDER_IDS.TRASH.toString(),
	USER_FOLDER_IDS.JUNK.toString(),
	USER_FOLDER_IDS.DRAFTS.toString()
];

export function getFilteredItemsForLocalFolder(mailItems, type) {
	const msgIdsToDownload = [],
		msgIdsToBeDeletedFromSource = [],
		convIdsToBeDeletedFromSource = [];

	if (type === 'conversation') {
		mailItems.forEach(conv => {
			const moveableMsgs = conv.messagesMetaData.filter(
				({ folderId }) => !~CANNOT_MOVE_INTO_LOCALFOLDER.indexOf(folderId)
			);

			if (moveableMsgs.length) {
				const moveableMsgIds = moveableMsgs.map(({ id }) => id);

				if (!(conv.messagesMetaData.length - moveableMsgs.length)) {
					// If difference between count of all messages in conv and that of messages to be moved to local folder is zero,
					// we can delete the conversation itself. In that case, moveableMsgs won't be candidates for deletion from source.
					convIdsToBeDeletedFromSource.push(conv.conversationId || conv.id);
				} else {
					msgIdsToBeDeletedFromSource.push(moveableMsgIds);
				}

				msgIdsToDownload.push(moveableMsgIds);
			}
		});
	} else {
		const moveableMsgIds = mailItems.map(({ id }) => id);
		msgIdsToDownload.push(moveableMsgIds);
		msgIdsToBeDeletedFromSource.push(moveableMsgIds);
	}

	return {
		...(msgIdsToDownload.length && {
			msgIdsToDownload: flatten(msgIdsToDownload)
		}),
		...(msgIdsToBeDeletedFromSource.length && {
			msgIdsToBeDeletedFromSource: flatten(msgIdsToBeDeletedFromSource)
		}),
		...(convIdsToBeDeletedFromSource.length && {
			convIdsToBeDeletedFromSource: flatten(convIdsToBeDeletedFromSource)
		})
	};
}
