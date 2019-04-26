import { route } from 'preact-router';
import { types as apiClientTypes } from '@zimbra/api-client';
import { renamedFolderAbsPath } from './folders';

export function isActiveFolder(folder, url, prefix = 'email', includeChildren = false) {
	if (!folder.absFolderPath) {
		return false;
	}
	const folderPath = folder.isLocalFolder
		? folder.absFolderPath.replace('/', '')
		: encodeURIComponent(folder.absFolderPath.replace('/', ''));
	const excludeChildrenRe = includeChildren ? '' : '($|/)';
	const re = new RegExp(`^/${prefix}/${folderPath}${excludeChildrenRe}`, 'i');
	return re.test(url);
}

export function isActiveOrChildFolder(folder, url, prefix = 'email') {
	return isActiveFolder(folder, url, prefix, true);
}

export function routeToRenamedFolder(folder, url, name) {
	route(
		url.replace(
			encodeURIComponent(folder.absFolderPath.replace('/', '')),
			encodeURIComponent(renamedFolderAbsPath(folder.absFolderPath, name))
		),
		true
	);
}

const { MailFolderView } = apiClientTypes;
const matchMessageOrConversation = new RegExp(
	`/(${MailFolderView.message}|${MailFolderView.conversation}).*`
);

/**
 * Given a uri, return a uri without `/(message|conversation)/:id`
 * @param {String} uri     A uri, e.g. "/email/Inbox/message/123"
 * @returns {String}       {@param uri} without "/message/123", e.g. "/email/Inbox"
 */
export function trimMailFolderViewFromUri(uri) {
	return uri && uri.replace(matchMessageOrConversation, '');
}
