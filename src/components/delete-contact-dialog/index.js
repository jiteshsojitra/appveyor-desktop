import { h } from 'preact';
import PropTypes from 'prop-types';
import { Text } from 'preact-i18n';

import ModalDialog from '../modal-dialog';

const DeleteContactDialog = ({ onConfirm, onClose, permanent }) => (
	<ModalDialog
		title={<Text id="dialogs.deleteContact.DIALOG_TITLE" />}
		onAction={onConfirm}
		onClose={onClose}
	>
		<p>
			<Text id={`dialogs.deleteContact.${permanent ? 'DESCRIPTION_PERMANENT' : 'DESCRIPTION'}`} />
		</p>
	</ModalDialog>
);

DeleteContactDialog.propTypes = {
	onConfirm: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired
};

export default DeleteContactDialog;
