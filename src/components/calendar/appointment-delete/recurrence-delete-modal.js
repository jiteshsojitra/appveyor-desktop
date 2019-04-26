import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';

import ModalDialog from '../../modal-dialog';
import s from './style';
import { EVENT_SELECTION_TYPE } from './../constants';
import linkState from 'linkstate';

export default class RecurrenceDeleteModal extends Component {
	state = {
		recurrenceType: EVENT_SELECTION_TYPE.event,
		notifyOrganizer: false
	};

	onAction = () => {
		const { onAction, event } = this.props;
		const { recurrenceType, notifyOrganizer } = this.state;
		onAction(event, recurrenceType === EVENT_SELECTION_TYPE.event, notifyOrganizer);
	};

	render({ onClose, event }, { recurrenceType, notifyOrganizer }) {
		return (
			<ModalDialog
				title="calendar.dialogs.recurrenceDelete.title"
				actionLabel="buttons.continue"
				onAction={this.onAction}
				onClose={onClose}
				class={s.recurrenceDeleteWrapper}
			>
				<div class={s.header}>
					<Text id="calendar.dialogs.recurrenceDelete.label" />
				</div>
				<div>
					<label>
						<ChoiceInput
							type="radio"
							name="recurrenceType"
							value="event"
							onChange={linkState(this, 'recurrenceType', 'target.value')}
							checked={recurrenceType === EVENT_SELECTION_TYPE.event}
						/>
						<Text id="calendar.dialogs.recurrenceDelete.eventOnly" />
					</label>
				</div>
				<div>
					<label>
						<ChoiceInput
							type="radio"
							name="recurrenceType"
							value="all"
							onChange={linkState(this, 'recurrenceType', 'target.value')}
							checked={recurrenceType === EVENT_SELECTION_TYPE.all}
						/>
						<Text id="calendar.dialogs.recurrenceDelete.allEvents" />
					</label>
				</div>
				{!event.isOrganizer && (
					<div>
						<div class={s.rectangle} />
						<div>
							<lable>
								<ChoiceInput
									checked={notifyOrganizer}
									onClick={linkState(this, 'notifyOrganizer')}
								/>
								<Text id="calendar.dialogs.recurrenceDelete.notifyOrganizer" />
							</lable>
						</div>
					</div>
				)}
			</ModalDialog>
		);
	}
}
