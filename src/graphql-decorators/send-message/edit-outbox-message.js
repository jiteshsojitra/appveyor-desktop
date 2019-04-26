import { withProps, compose } from 'recompose';
import { replaceFlag } from '../../lib/util';
import { OUTBOX, DRAFTS } from '../../constants/folders';
import { withSaveDraft } from './';
import { route } from 'preact-router';
import { types as apiClientTypes } from '@zimbra/api-client';
const { MessageFlags } = apiClientTypes;

export default function withEditOutboxMessage({ name = 'editOutboxMessage' } = {}) {
	// A message becomes editable when the `d` (draft) flag is added.
	return compose(
		// TODO: Change this to be client-only, dont hit network
		withSaveDraft({
			name,
			update: {
				after: () => {
					// After editting the message, route to the same message in the Drafts folder.
					setTimeout(() => {
						route(location.pathname.replace(OUTBOX, DRAFTS), true);
					});
				}
			}
		}),
		withProps(props => ({
			[name]: message =>
				props[name]({
					...message,
					// Save in the default Drafts folder
					folderId: null,
					// Remove the `sentByMe` flag and replace it with `draft`
					flags: replaceFlag(message.flags, MessageFlags.sentByMe, MessageFlags.draft)
				})
		}))
	);
}
