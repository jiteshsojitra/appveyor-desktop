import { h, Component } from 'preact';
import wire from 'wiretie';
import { Text, withText } from 'preact-i18n';
import { connect } from 'preact-redux';
import { get } from 'lodash';
import ModalDialog from '../../modal-dialog';
import { getFileContent } from '../../../lib/util';
import style from './style';

@connect(({ email = {} }) => ({
	username: get(email, 'account.name')
}))
@wire('zimbra', {}, zimbra => ({
	import: zimbra.calendars.import
}))
@withText('calendar.dialogs.importCalendar.ERROR_IMPORT_UNKNOWN')
export default class ImportCalendarModal extends Component {
	state = {
		calendarFile: '',
		loading: false,
		error: ''
	};

	chooseCalendar = ({ target }) => {
		this.setState({ loading: true }, () =>
			getFileContent(target.files[0])
				.then(file => {
					this.setState({
						calendarFile: file,
						loading: false,
						error: ''
					});
				})
				.catch(e => {
					this.setState({
						calendarFile: '',
						loading: false,
						error: e.message
					});
				})
		);
	};

	clickFileInput = () => this.fileInput.click();
	stopPropagation = ev => ev.stopPropagation();

	handleImport = () => {
		this.setState({ loading: true });
		this.props
			.import(this.state.calendarFile, this.props.calendarName, 'ics', this.props.username)
			.then(result => {
				this.setState({ error: '' });
				this.props.onRefetchCalendars();
				return result;
			})
			.then(() => {
				this.setState({ loading: false }, this.props.onClose);
			})
			.catch(err => {
				console.error(err);
				this.setState({ error: this.props.ERROR_IMPORT_UNKNOWN, loading: false });
			});
	};

	render({ onClose }, { calendarFile, loading, error }) {
		return (
			<ModalDialog
				title="calendar.dialogs.importCalendar.DIALOG_TITLE"
				actionLabel="buttons.import"
				onAction={this.handleImport}
				onClose={onClose}
				contentClass={style.importCalendarModalContent}
				disablePrimary={calendarFile.length === 0}
				pending={loading}
				error={error}
			>
				<p>
					<Text id="calendar.dialogs.importCalendar.PROMPT_TEXT" />
				</p>
				<div class={style.chooseFileWrapper} onClick={this.clickFileInput}>
					<input
						ref={input => (this.fileInput = input)}
						type="file"
						onChange={this.chooseCalendar}
						onClick={this.stopPropagation}
					>
						<Text id="calendar.dialogs.importCalendar.CHOOSE_FILE" />
					</input>
				</div>
			</ModalDialog>
		);
	}
}
