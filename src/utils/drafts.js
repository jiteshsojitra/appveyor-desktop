import { hasFlag } from '../lib/util';

export const isAutoSendDraftMessage = message => hasFlag(message, 'draft') && message.autoSendTime;

// Is this a conversation that isn't "sent", but contains a message that
// is scheduled for sending?
export const isAutoSendDraftConversation = conversation =>
	hasFlag(conversation, 'draft') &&
	conversation.messages &&
	conversation.messages.some(msg => hasFlag(msg, 'draft') && isAutoSendDraftMessage(msg));
