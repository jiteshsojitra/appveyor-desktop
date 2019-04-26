import { h, Component } from 'preact';
import ModalDialog from '../../modal-dialog';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import { readFile } from '../../../lib/file';
import { bindActionCreators } from 'redux';
import * as contactsActionCreators from '../../../store/contacts/actions';
import wire from 'wiretie';
import style from './style';

const MAX_FILE_SIZE_IN_BYTES = 5242880;

@connect(
	null,
	bindActionCreators.bind(null, contactsActionCreators)
)
@wire('zimbra', null, zimbra => ({
	importContacts: zimbra.contacts.import
}))
export default class ImportContactsFromFile extends Component {
	state = {
		pending: false
	};

	fileRef = c => {
		this.fileInput = c;
	};

	closeDialog = () => {
		const { onClose } = this.props;
		if (onClose) onClose();
	};

	setFile = e => {
		const file = e.target.files[0];
		if (file.size > MAX_FILE_SIZE_IN_BYTES) {
			this.setState({
				error: 'contacts.importFromFile.FILE_SIZE_EXCEEDED'
			});
		} else {
			this.setState({
				error: '',
				file
			});
		}
	};

	import = () => {
		const { importContacts, setLastUpdated, refetchContacts } = this.props,
			{ file, error } = this.state;

		if (error) return;
		if (!file) {
			return this.setState({
				error: 'contacts.importFromFile.NO_FILE'
			});
		}

		const fileExt = file.name.replace(/.*\.(.*)$/, '$1');
		if (!fileExt.match(/(csv|vcf)$/i)) {
			return this.setState({
				error: 'contacts.importFromFile.UPLOAD_INVALID'
			});
		}

		this.setState({
			error: null,
			pending: true
		});

		readFile(file)
			.then(text => importContacts(text, { format: fileExt }))
			.then(() => {
				refetchContacts && refetchContacts();
				setLastUpdated();
				this.closeDialog();
			})
			.catch(e => {
				this.setState({
					error: String((e && e.message) || e),
					pending: false
				});
			});
	};

	componentDidMount() {
		this.fileInput.value = '';
	}

	render({}, { pending, error }) {
		return (
			<ModalDialog
				pending={pending}
				class={style.importContactsFromFile}
				title="contacts.importFromFile.DIALOG_TITLE"
				actionLabel="contacts.importFromFile.IMPORT_BUTTON"
				onAction={this.import}
				onClose={this.closeDialog}
			>
				<form onSubmit={this.import} action="javascript:">
					<p class={style.description}>
						<Text id="contacts.importFromFile.DESCRIPTION" />
					</p>

					{error && (
						<div key="error" class={style.error}>
							<Text id={error} />
						</div>
					)}

					<input
						type="file"
						accept=".csv, text/csv, .vcf, text/vcard"
						onChange={this.setFile}
						ref={this.fileRef}
					/>
				</form>
			</ModalDialog>
		);
	}
}
