import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { KeyCodes } from '@zimbra/blocks';
import TextInput from '../text-input';
import linkState from 'linkstate';
import ModalDialog from '../modal-dialog';
import style from './style';

export default class CreateListDialog extends Component {
	state = {
		value: this.props.name || this.props.value || ''
	};

	confirm = () => {
		const { onCreate } = this.props;
		this.setState({ confirmInProgress: true });

		onCreate(this.state.value)
			.catch(() => {}) // Error is handled by the parent
			.then(() => {
				this.setState({ confirmInProgress: false });
			});
	};

	close = () => {
		const { onClose } = this.props;
		if (onClose) onClose();
	};

	handleKeyDown = e => {
		if (e.keyCode === KeyCodes.CARRIAGE_RETURN && this.state.value) {
			this.confirm();
		}
	};

	render({ error }, { value, confirmInProgress }) {
		return (
			<ModalDialog
				class={style.createListDialog}
				title="tasks.createList.title"
				actionLabel="tasks.createList.create"
				cancelLabel="tasks.createList.cancel"
				onAction={this.confirm}
				onClose={this.close}
				error={error}
				pending={confirmInProgress}
				disablePrimary={!(value && value.trim())}
			>
				<p>
					<Text id="tasks.createList.description" />
				</p>
				<form onSubmit={this.confirm} action="javascript:">
					<TextInput
						autofocus
						placeholderId="tasks.createList.placeholder"
						value={value}
						onKeyDown={this.handleKeyDown}
						onInput={linkState(this, 'value')}
					/>
				</form>
			</ModalDialog>
		);
	}
}
