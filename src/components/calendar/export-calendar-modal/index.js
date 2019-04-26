import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import wire from 'wiretie';

import ModalDialog from '../../modal-dialog';

import { get } from 'lodash';

import style from './style';
import { saveCalendarAs } from '../../../lib/util';

@connect(({ email = {} }) => ({
	username: get(email, 'account.name')
}))
@wire('zimbra', {}, zimbra => ({
	export: zimbra.calendars.export
}))
export default class ExportCalendarModal extends Component {
	state = {
		loading: false,
		error: ''
	};

	handleDownload = () => {
		this.setState({ loading: true });
		this.props
			.export(this.props.calendarName, this.props.username)
			.then(result => {
				saveCalendarAs(result);
				this.setState(
					{
						loading: false,
						error: ''
					},
					this.props.onClose
				);
			})
			.catch(err => {
				this.setState(
					{
						loading: false,
						error: err.message
					},
					this.props.onClose
				);
			});
	};

	render({ onClose }, { loading, error }) {
		return (
			<ModalDialog
				title="calendar.dialogs.exportCalendar.DIALOG_TITLE"
				actionLabel="buttons.export"
				onAction={this.handleDownload}
				onClose={onClose}
				contentClass={style.exportCalendarModalContent}
				pending={loading}
				error={error}
			>
				<p>
					<Text id="calendar.dialogs.exportCalendar.PROMPT_TEXT" />
				</p>
				{loading && <div class={style.loader} />}
			</ModalDialog>
		);
	}
}
