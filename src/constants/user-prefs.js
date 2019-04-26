import { conversation as conversationType, message as messageType } from './types';

export const groupMailBy = {
	name: 'zimbraPrefGroupMailBy',
	values: {
		conversation: conversationType,
		message: messageType
	},
	default: conversationType
};
