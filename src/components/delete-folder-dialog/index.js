import { h } from 'preact';
import PropTypes from 'prop-types';
import { Text } from 'preact-i18n';

import ModalDialog from '../modal-dialog';

const DeleteFolderDialog = ({ onConfirm, onClose, folder, permanent }) => (
	<ModalDialog
		title={<Text id="dialogs.deleteFolder.DIALOG_TITLE" fields={{ name: folder.name }} />}
		onAction={onConfirm}
		onClose={onClose}
	>
		<p>
			<Text
				id={`dialogs.deleteFolder.${
					folder.query
						? 'DESCRIPTION_SAVED_SEARCHES'
						: permanent
						? 'DESCRIPTION_PERMANENT'
						: 'DESCRIPTION'
				}`}
				fields={{ name: folder.name }}
			/>
		</p>
	</ModalDialog>
);

DeleteFolderDialog.propTypes = {
	onConfirm: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
	folder: PropTypes.object.isRequired
};

export default DeleteFolderDialog;
