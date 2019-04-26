import { h, Component } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import linkState from 'linkstate';
import { parseUrl } from '../../../../lib/util';
import ModalDialog from '../../../modal-dialog';
import TextInput from '../../../text-input';
import style from './style';

export class LinkEditorDialog extends Component {
	state = {
		text: this.props.text || '',
		url: this.props.url || ''
	};

	closeDialog = () => {
		const { onClose } = this.props;
		if (onClose) onClose();
	};

	getParsedUrl() {
		return parseUrl(this.state.url);
	}

	insertLink = () => {
		const { text } = this.state;
		const url = this.getParsedUrl();
		this.closeDialog();
		if (url) {
			this.props.onInsertLink({
				url,
				text
			});
		}
	};

	componentWillReceiveProps({ text, url }) {
		if (this.props.text !== text || this.props.url !== url) {
			this.setState({ text, url });
		}
	}

	render({}, { text, url }) {
		const parsedUrl = this.getParsedUrl();

		return (
			<ModalDialog
				class={style.linkEditorDialog}
				title="compose.linkEditorDialog.title"
				actionLabel="buttons.ok"
				cancelLabel="buttons.cancel"
				disablePrimary={!parsedUrl}
				onAction={this.insertLink}
				onClose={this.closeDialog}
			>
				<div class={style.linkForm}>
					<form onSubmit={this.insertLink} action="javascript:">
						<label for="displayText">
							<Text id="compose.linkEditorDialog.displayText" />
						</label>
						<TextInput
							autocomplete="off"
							onInput={linkState(this, 'text')}
							id="displayText"
							value={text}
						/>
						<label for="editLink">
							<Text id="compose.linkEditorDialog.editLink" />
						</label>
						<Localizer>
							<TextInput
								autocomplete="off"
								onInput={linkState(this, 'url')}
								id="editLink"
								value={url}
								placeholderId="compose.linkEditorDialog.placeholderText"
							/>
						</Localizer>
						<button type="submit" hidden />
					</form>
					<a
						{...(parsedUrl
							? { href: parsedUrl, target: '_blank', rel: 'noreferrer noopener' }
							: {})}
						class={style.linkButton}
					>
						<Text id="compose.linkEditorDialog.followLink" />
					</a>
				</div>
			</ModalDialog>
		);
	}
}
