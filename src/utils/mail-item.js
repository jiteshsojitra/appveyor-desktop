import uniqBy from 'lodash-es/uniqBy';
import compact from 'lodash-es/compact';
import get from 'lodash-es/get';
import last from 'lodash-es/last';
import { types as apiClientTypes } from '@zimbra/api-client';
import { hasFlag, getXmlAttribute } from '../lib/util';
import { isAutoSendDraftMessage, isAutoSendDraftConversation } from '../utils/drafts';
import { isAccount, withoutAccountAddresses } from './account';
import { USER_FOLDER_IDS } from '../constants';
import { REPLY_SUBJECT_PREFIX } from '../constants/mail';

const { MailFolderView } = apiClientTypes;

function isDraftMessage(msg) {
	return hasFlag(msg, 'draft') && !isAutoSendDraftMessage(msg);
}

function isDraftConversation(conv) {
	return (
		conv && conv.numMessages >= 1 && hasFlag(conv, 'draft') && !isAutoSendDraftConversation(conv)
	);
}

export function isDraft(mailItem, type) {
	return type === MailFolderView.conversation
		? isDraftConversation(mailItem)
		: isDraftMessage(mailItem);
}

export function isUnread(mailItem) {
	return hasFlag(mailItem, 'unread');
}

export function isFlagged(mailItem) {
	return hasFlag(mailItem, 'flagged');
}
export function isUrgent(mailItem) {
	return hasFlag(mailItem, 'urgent');
}
export function isSentByMe(mailItem) {
	return hasFlag(mailItem, 'sentByMe');
}
export function isAttachment(mailItem) {
	return hasFlag(mailItem, 'attachment');
}

export function isMessageTrashed(mailItem) {
	return mailItem && String(mailItem.folderId) === String(USER_FOLDER_IDS.TRASH);
}

export function getSenders(mailItem) {
	return (
		mailItem.senders ||
		mailItem.from ||
		(mailItem.emailAddresses &&
			uniqBy(mailItem.emailAddresses, 'address').filter(s => s.type === 'f')) ||
		[]
	);
}

export function displaySenders(mailItem, account) {
	if (!mailItem.emailAddresses) {
		return [];
	}

	const filteredAddresses = mailItem.emailAddresses.filter(s => s.type === 'f');

	return compact(
		filteredAddresses.map(s => (isAccount(account, s) ? 'me' : s.name || s.displayName))
	);
}

export function displayToAddresses(mailItem, account) {
	if (!mailItem.emailAddresses) return [];

	const filteredAddresses = mailItem.emailAddresses.filter(s => s.type === 't');

	return compact(
		filteredAddresses.map(s => (isAccount(account, s) ? 'me' : s.name || s.displayName))
	);
}

export function fromSenders(mailItem, account) {
	return mailItem.emailAddresses
		? mailItem.emailAddresses.filter(s => s.type === 'f').filter(withoutAccountAddresses(account))
		: [];
}

export function getShareAttribute(mailItem, selector, attr) {
	return getXmlAttribute(get(mailItem, 'share[0].content'), selector, attr);
}

export function isMessageToBeReplied(message) {
	return (message && message.subject && message.subject.includes(REPLY_SUBJECT_PREFIX)) || false;
}

export function isSignedMessage(message) {
	return get(message, 'attributes.isSigned');
}

export function isEncryptedMessage(message) {
	return get(message, 'attributes.isEncrypted');
}

export function isSMIMEMessage(message) {
	return isSignedMessage(message) || isEncryptedMessage(message);
}

/**
 * When clicking 'Show Original' from context menu or header action menu,
 * Return message id in case of `message` view else
 * return recent email's id in case of `conversation` view.
 */
export function getIdForShowOriginalMime(message, hasMetadata = true) {
	return (
		message &&
		(message.__typename === 'MessageInfo'
			? message.id
			: hasMetadata
			? get(message, 'messagesMetaData.0.id')
			: last(message.messages).id)
	);
}
