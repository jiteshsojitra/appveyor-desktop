import flatMapDeep from 'lodash-es/flatMapDeep';
import without from 'lodash-es/without';
import find from 'lodash-es/find';
import compact from 'lodash-es/compact';
import last from 'lodash-es/last';
import escapeStringRegexp from 'escape-string-regexp';

import { USER_ROOT_FOLDER_ID } from '../constants';

// special folders is used for both position and order
const SPECIAL_FOLDERS = ['inbox', 'drafts', 'sent', 'archive', 'junk', 'trash', 'outbox'];
const IGNORE_FOLDERS = ['USER_ROOT'];
const CANNOT_MOVE_INTO_FOLDERS = ['outbox'];
const CANNOT_MOVE_OUT_OF_FOLDERS = ['outbox'];
export const SPECIAL_FOLDERS_WITHOUT_TRASH = without(SPECIAL_FOLDERS, 'trash');

// Flags to specify actions allowed to be taken on mail items in a folder
export const MAIL_ITEM_ACTION_REPLY_FORWARD = 1;
export const MAIL_ITEM_ACTION_DELETE = 2;
export const MAIL_ITEM_ACTION_ARCHIVE = 4;
export const MAIL_ITEM_ACTION_MOVE = 8;
export const MAIL_ITEM_ACTION_SPAM = 16;
export const MAIL_ITEM_ACTION_EDIT = 32;
export const MAIL_ITEM_ACTION_MORE = 64;
export const MAIL_ITEM_ACTION_DEFAULT =
	MAIL_ITEM_ACTION_REPLY_FORWARD |
	MAIL_ITEM_ACTION_DELETE |
	MAIL_ITEM_ACTION_ARCHIVE |
	MAIL_ITEM_ACTION_MOVE |
	MAIL_ITEM_ACTION_SPAM |
	MAIL_ITEM_ACTION_MORE;

// Given a folderName, set the available actions for mail items in that folder.
const MAIL_ITEM_ACTIONS_RESTRICTION_FOLDERS = {
	drafts: MAIL_ITEM_ACTION_DELETE,
	sent: MAIL_ITEM_ACTION_DEFAULT & ~MAIL_ITEM_ACTION_SPAM, // all actions but not SPAM
	outbox: MAIL_ITEM_ACTION_DELETE | MAIL_ITEM_ACTION_EDIT
};

function hasBit(bit, mask) {
	return (mask & bit) !== 0;
}

export function canReplyForward(folderName) {
	return hasBit(MAIL_ITEM_ACTION_REPLY_FORWARD, getAllowedMailItemActions(folderName));
}
export function canDelete(folderName) {
	return hasBit(MAIL_ITEM_ACTION_DELETE, getAllowedMailItemActions(folderName));
}
export function canArchive(folderName) {
	return hasBit(MAIL_ITEM_ACTION_ARCHIVE, getAllowedMailItemActions(folderName));
}
export function canMove(folderName) {
	return hasBit(MAIL_ITEM_ACTION_MOVE, getAllowedMailItemActions(folderName));
}
export function canSpam(folderName) {
	return hasBit(MAIL_ITEM_ACTION_SPAM, getAllowedMailItemActions(folderName));
}
export function canEdit(folderName) {
	return hasBit(MAIL_ITEM_ACTION_EDIT, getAllowedMailItemActions(folderName));
}
export function canMore(folderName) {
	return hasBit(MAIL_ITEM_ACTION_MORE, getAllowedMailItemActions(folderName));
}
export function canMoveMailInto(folderName) {
	return folderName && !CANNOT_MOVE_INTO_FOLDERS.includes(String(folderName).toLowerCase());
}
export function canMoveMailOutOf(folderName) {
	return folderName && !CANNOT_MOVE_OUT_OF_FOLDERS.includes(String(folderName).toLowerCase());
}

/**
 * Return a bit mask representing allowed operations for a given folder
 */
export function getAllowedMailItemActions(folderName) {
	return (
		(folderName && MAIL_ITEM_ACTIONS_RESTRICTION_FOLDERS[String(folderName).toLowerCase()]) ||
		MAIL_ITEM_ACTION_DEFAULT
	);
}

function baseFilter(folders) {
	return folders.filter(f => !IGNORE_FOLDERS.includes(f.name.toString().toLowerCase()));
}

export function specialFolders(folders, specialFolderList = SPECIAL_FOLDERS) {
	return !(folders && folders.length)
		? []
		: specialFolderList.reduce((result, specialName) => {
				for (let i = folders.length; i--; ) {
					const folder = folders[i];
					if (folder.name.toString().toLowerCase() === specialName) {
						result.push(folder);
						break;
					}
				}
				return result;
		  }, []);
}

export function customFolders(folders, specialFolderList = SPECIAL_FOLDERS) {
	if (!folders) return [];
	return baseFilter(folders).filter(
		({ name }) => !specialFolderList.includes(name.toString().toLowerCase())
	);
}

/**
 * Given a list of folders, return a list of folders that are allowed to have
 * messages moved into them
 */
export function canMoveMessagesIntoFolders(folders) {
	if (!folders) return [];
	return baseFilter(folders).filter(({ name }) => canMoveMailInto(name));
}

export function isChildFolder(rootFolder, folderId) {
	const queue = rootFolder.folder ? [...rootFolder.folder] : [];

	while (queue.length > 0) {
		const child = queue.shift();
		if (child.id === folderId) {
			return true;
		} else if (child.folder && child.folder.length > 0) {
			queue.push(...child.folder);
		}
	}

	return false;
}

/**
 * Find a folder recursively in a tree of Zimbra folders.
 */
export function findFolder(rootFolder, folderId) {
	const queue = rootFolder.folders ? [...rootFolder.folders] : [...rootFolder];

	while (queue.length > 0) {
		const child = queue.shift();
		if (child.id.toString() === folderId.toString()) {
			return child;
		} else if (child.folders && child.folders.length > 0) {
			queue.push(...child.folders);
		}
	}

	return false;
}

export function isTopLevelFolder(folder) {
	return folder.parentFolderId && folder.parentFolderId.toString() === USER_ROOT_FOLDER_ID;
}

export function renamedFolderAbsPath(prevAbsPath, newName) {
	const parentFolders = prevAbsPath.split('/');
	parentFolders.shift(); // Leading slash
	parentFolders.pop(); // Current folder name
	return [...parentFolders, newName].join('/');
}

export function flattenFolders(folders) {
	return flatMapDeep(folders, f => [f, ...(f.folders ? flattenFolders(f.folders) : [])]);
}

export function filteredFolders(folders, query) {
	if (!folders || query === '') {
		return [];
	}

	const regex = new RegExp(escapeStringRegexp(query), 'ig');

	return flattenFolders(folders).filter(f => f.name.toString().match(regex));
}

const FLAGS = {
	checked: '#'
};

export function hasFlag(folder, flag) {
	const flags = folder.flags || folder.flag;
	return flags ? flags.indexOf(FLAGS[flag] || flag) > -1 : false;
}

/**
 * Mutate the flags on the folder to add the specified flag
 */
export function toggleFlag(folder, flag) {
	if (hasFlag(folder, flag)) {
		folder.flags = folder.flags.replace(FLAGS[flag], '');
	} else {
		folder.flags = (folder.flags || '') + FLAGS[flag];
	}
}

export function inFolder(currentFolder, name) {
	return currentFolder && currentFolder.name.toLowerCase() === name;
}

export function findFolderByName(folders, name) {
	return find(
		flattenFolders(folders),
		f => f.absFolderPath && f.absFolderPath.replace('/', '') === name
	);
}

export function getConversationFolder(folders, conversation) {
	if (!folders || !conversation.messages || conversation.messages.length === 0) {
		return null;
	}

	const messageFolders = compact(conversation.messages.map(m => findFolder(folders, m.folderId)));

	return last(canMoveMessagesIntoFolders(messageFolders)) || last(messageFolders);
}

export function isRenameAllowed(folderName) {
	return folderName && !~SPECIAL_FOLDERS.indexOf(folderName.toLowerCase());
}
