import { h } from 'preact';
import PropTypes from 'prop-types';
import { Text } from 'preact-i18n';

import ModalDialog from '../modal-dialog';

const SaveContactDialog = ({ buttons, ...props }) => (
	<ModalDialog
		{...props}
		title={<Text id="dialogs.saveContact.DIALOG_TITLE" />}
		buttons={buttons}
		actionLabel="dialogs.saveContact.PROCEED"
		discardLabel="dialogs.saveContact.DISCARD"
	/>
);

SaveContactDialog.propTypes = {
	buttons: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired
};

export default SaveContactDialog;
