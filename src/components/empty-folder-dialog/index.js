import { h } from 'preact';
import PropTypes from 'prop-types';
import { Text } from 'preact-i18n';

import ModalDialog from '../modal-dialog';

const EmptyFolderDialog = ({ onConfirm, onClose, folder }) => (
	<ModalDialog
		title={<Text id="dialogs.emptyFolder.DIALOG_TITLE" fields={{ name: folder.name }} />}
		onAction={onConfirm}
		onClose={onClose}
	>
		<p>
			<Text id="dialogs.emptyFolder.DESCRIPTION" fields={{ name: folder.name }} />
		</p>
	</ModalDialog>
);

EmptyFolderDialog.propTypes = {
	onConfirm: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
	folder: PropTypes.object.isRequired
};

export default EmptyFolderDialog;
