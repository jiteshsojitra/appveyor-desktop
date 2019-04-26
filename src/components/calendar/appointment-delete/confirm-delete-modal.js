import { h } from 'preact';
import { Text } from 'preact-i18n';

import ModalDialog from '../../modal-dialog';
import s from './style';
import { callWith } from '../../../lib/util';

const ConfirmDelete = ({ event, deleteSingleInstance, onClose }) => (
	<ModalDialog
		title="calendar.dialogs.deleteEvent.title"
		actionLabel="buttons.continue"
		onAction={callWith(deleteSingleInstance, event, false)}
		onClose={onClose}
	>
		<div class={s.header}>
			<Text id="calendar.dialogs.deleteEvent.label" />
		</div>
	</ModalDialog>
);

export default ConfirmDelete;
