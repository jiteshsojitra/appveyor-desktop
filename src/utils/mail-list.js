import union from 'lodash-es/union';
import { USER_FOLDER_IDS } from '../constants/index';
import { FLAGS } from '../lib/util';
//function to get individual flags for a group of selected mails
export function getIndividualFlag(selectedIds, flagOfCurrentMessage, initialIteration) {
	let flags = [];
	if (selectedIds.size > initialIteration) {
		const flagsArray = Array.from(selectedIds).map(m => m.flags);
		flags = getSelectFlags(flagsArray);
	} else {
		flagOfCurrentMessage && !Array.isArray(flagOfCurrentMessage)
			? (flagOfCurrentMessage.includes(FLAGS.draft) && flags.push(FLAGS.draft)) ||
			  (flagOfCurrentMessage.includes(FLAGS.sentByMe) && flags.push(FLAGS.sentByMe))
			: flags.push(null);
	}
	return flags;
}

export function getSelectFlags(messageFlags) {
	let flagsArray = [];
	messageFlags.forEach(m => {
		const individualFlag = [];
		if (!m) {
			individualFlag.push(null);
		} else if (m.includes(FLAGS.sentByMe) || m.includes(FLAGS.draft)) {
			(m.includes(FLAGS.draft) && individualFlag.push(FLAGS.draft)) ||
				(m.includes(FLAGS.sentByMe) && individualFlag.push(FLAGS.sentByMe));
		} else {
			individualFlag.push(null);
		}
		flagsArray = union(individualFlag, flagsArray);
	});
	return flagsArray;
}

export function getAllowedFoldersForMove(flagsArray, tempFolders) {
	let nonDroppableFolders = [];
	tempFolders = addDropKey(tempFolders, true);
	if (!flagsArray) {
		return tempFolders;
	}
	if (flagsArray.indexOf(FLAGS.draft) !== -1) {
		tempFolders = addDropKey(tempFolders, false);
		const droppableFolders = [USER_FOLDER_IDS.TRASH.toString()];
		flagsArray.length === 1 && droppableFolders.push(USER_FOLDER_IDS.DRAFTS.toString());
		tempFolders.length &&
			tempFolders.forEach(f => {
				if (droppableFolders.indexOf(f.id) !== -1) {
					f.droppable = true;
				}
			});
	} else if (flagsArray.indexOf(FLAGS.sentByMe) !== -1) {
		nonDroppableFolders = [
			USER_FOLDER_IDS.INBOX.toString(),
			USER_FOLDER_IDS.JUNK.toString(),
			USER_FOLDER_IDS.DRAFTS.toString()
		];
		flagsArray.length > 1 && nonDroppableFolders.push(USER_FOLDER_IDS.SENT.toString());
		tempFolders.length &&
			tempFolders.forEach(f => {
				if (nonDroppableFolders.indexOf(f.id) !== -1) {
					f.droppable = false;
				}
			});
	} else {
		nonDroppableFolders = [USER_FOLDER_IDS.SENT.toString(), USER_FOLDER_IDS.DRAFTS.toString()];
		tempFolders.length &&
			tempFolders.forEach(f => {
				if (nonDroppableFolders.indexOf(f.id) !== -1) {
					f.droppable = false;
				}
			});
	}
	return tempFolders;
}

export function addDropKey(folders, flag) {
	return folders.map(f => ({
		...f,
		droppable: flag,
		folders: f.folders ? addDropKey(f.folders, flag) : null
	}));
}
