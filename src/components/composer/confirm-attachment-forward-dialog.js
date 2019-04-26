import { h } from 'preact';
import { Text } from 'preact-i18n';
import ModalDialog from '../modal-dialog';
import { callWith } from '../../lib/util';

export default function ConfirmAttachmentForwardDialog({ onConfirm }) {
	return (
		<ModalDialog
			title="compose.confirmAttachmentForward.TITLE"
			actionLabel="compose.confirmAttachmentForward.CONFIRM"
			cancelLabel="compose.confirmAttachmentForward.CANCEL"
			onAction={callWith(onConfirm, true)}
			onClose={callWith(onConfirm, false)}
		>
			<p>
				<Text id="compose.confirmAttachmentForward.DESCRIPTION" />
			</p>
		</ModalDialog>
	);
}
