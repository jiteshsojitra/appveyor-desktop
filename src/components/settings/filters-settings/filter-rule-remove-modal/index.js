import { h } from 'preact';
import { Text } from 'preact-i18n';
import ConfirmModalDialog from '../../../confirm-modal-dialog';

export default function FilterRuleRemoveModal({ onResult, value }) {
	return (
		<ConfirmModalDialog
			title={<Text id="settings.filterRuleRemoveModal.title" />}
			cancelButton={false}
			onResult={onResult}
			rejectText="buttons.cancel"
		>
			<p>
				<Text id="settings.filterRuleRemoveModal.description" fields={{ name: value.name }} />
			</p>
		</ConfirmModalDialog>
	);
}
