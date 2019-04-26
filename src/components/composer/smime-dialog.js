import { h } from 'preact';
import { Text } from 'preact-i18n';

import ModalDialog from '../modal-dialog';

const SMIMEDialog = ({
	onClose,
	onAction,
	textId,
	dialogTitle,
	actionText,
	cancelText,
	cancelButton
}) => (
	<ModalDialog
		title={dialogTitle}
		actionLabel={actionText}
		cancelLabel={cancelText}
		onClose={onClose}
		onAction={onAction}
		cancelButton={cancelButton}
	>
		<p>
			<Text id={textId} />
		</p>
	</ModalDialog>
);

export default SMIMEDialog;
