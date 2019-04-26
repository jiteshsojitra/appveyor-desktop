import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';

import ModalDialog from '../../modal-dialog';
import s from './style';

export default class RecurrenceEditModal extends Component {
	state = {
		recurrenceType: 'event'
	};

	onAction = () => {
		const { onAction, event } = this.props;
		const { recurrenceType } = this.state;

		onAction(event, recurrenceType === 'event');
	};

	handleInputChange = ev => {
		const {
			target: { value }
		} = ev;

		this.setState({
			recurrenceType: value
		});
	};

	render({ onClose }, { recurrenceType }) {
		return (
			<ModalDialog
				title="calendar.dialogs.recurrenceEdit.title"
				actionLabel="buttons.continue"
				onAction={this.onAction}
				onClose={onClose}
				class={s.recurrenceEditModal}
			>
				<div class={s.header}>
					<Text id="calendar.dialogs.recurrenceEdit.label" />
				</div>
				<div>
					<label>
						<ChoiceInput
							type="radio"
							name="recurrenceType"
							value="event"
							onChange={this.handleInputChange}
							checked={recurrenceType === 'event'}
						/>
						<Text id="calendar.dialogs.recurrenceEdit.eventOnly" />
					</label>
				</div>
				<div>
					<label>
						<ChoiceInput
							type="radio"
							name="recurrenceType"
							value="all"
							onChange={this.handleInputChange}
							checked={recurrenceType === 'all'}
						/>
						<Text id="calendar.dialogs.recurrenceEdit.allEvents" />
					</label>
				</div>
			</ModalDialog>
		);
	}
}
