import cloneDeep from 'lodash/cloneDeep';
import {
	FORWARD,
	REPLY,
	REPLY_ALL,
	FORWARD_SUBJECT_PREFIX,
	REPLY_SUBJECT_PREFIX
} from '../constants/mail';
import array from '@zimbra/util/src/array';
import { getEmailBody, htmlToText } from '../lib/html-email';
import incomingMessage from '../components/composer/vhtml-templates/incoming-message';
import newMessageDraft from './new-message-draft';

export default function draftForMessage(type, message, accountAddr) {
	const subjectPrefix = type === FORWARD ? FORWARD_SUBJECT_PREFIX : REPLY_SUBJECT_PREFIX;
	const subject = `${subjectPrefix}: ${(message.subject || '').replace(/^((fwd|re):\s*)*/gi, '')}`;

	const bodyWithReply = incomingMessage({
		date: new Date(message.date).toLocaleString(),
		from: message.from && message.from[0],
		body: getEmailBody(cloneDeep(message), { allowImages: true })
	});

	const baseResponseMessage = {
		...newMessageDraft(),
		attachments: array(message.attachments),
		conversationId: message.conversationId,
		html: bodyWithReply,
		inReplyTo: message.messageId,
		inlineAttachments: array(message.inlineAttachments),
		origId: message.id.toString(),
		subject,
		text: htmlToText(bodyWithReply)
	};

	const filterSelf = ({ address }) =>
		address.localeCompare(accountAddr, undefined, { sensitivity: 'base' }) !== 0;

	switch (type) {
		case REPLY:
			return {
				...baseResponseMessage,
				replyType: 'r',
				to: array(message.from),
				from: array(message.to).filter(({ address }) => address === accountAddr),
				attachments: []
			};
		case REPLY_ALL:
			return {
				...baseResponseMessage,
				cc: array(message.cc).filter(filterSelf),
				replyType: 'r',
				to: array(message.from).concat(array(message.to).filter(filterSelf)),
				from: array(message.to).filter(({ address }) => address === accountAddr),
				attachments: []
			};
		case FORWARD:
			return {
				...baseResponseMessage,
				replyType: 'w',
				from: array(message.to).filter(({ address }) => address === accountAddr)
			};
		default:
			throw new Error(`Unsupported response type '${type}'`);
	}
}
