import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import linkState from 'linkstate';

import ModalDialog from '../../modal-dialog';
import s from './style';

export default class InformOrganizer extends Component {
	state = {
		notifyOrganizer: false
	};

	onAction = () => {
		const { onAction, event } = this.props;
		const { notifyOrganizer } = this.state;
		onAction(event, false, notifyOrganizer);
	};

	render({ onClose }, { notifyOrganizer }) {
		return (
			<ModalDialog
				title="calendar.dialogs.deleteEvent.title"
				actionLabel="buttons.delete"
				onAction={this.onAction}
				onClose={onClose}
			>
				<div class={s.header}>
					<Text id="calendar.dialogs.deleteEvent.label" />
				</div>
				<div class={s.notifyOrganizer}>
					<label>
						<ChoiceInput checked={notifyOrganizer} onClick={linkState(this, 'notifyOrganizer')} />
						<Text id="calendar.dialogs.deleteEvent.notifyOrganizer" />
					</label>
				</div>
			</ModalDialog>
		);
	}
}
