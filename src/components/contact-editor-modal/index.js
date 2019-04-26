import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import { Text } from 'preact-i18n';
import { ModalDialog, Spinner } from '@zimbra/blocks';
import CloseButton from '../close-button';
import ContactEditor from '../contacts/editor';
import style from './style';

export default class ModalContactEditor extends PureComponent {
	cancel = () => {
		const { onClose } = this.props;
		if (onClose) onClose();
		else this.setState({ closed: true });
	};

	beforeSave = () => {
		this.setState({ saving: true });
	};

	afterSave = () => {
		this.setState({ saving: false });
		this.cancel();
	};

	render({ contact }, { closed, saving }) {
		if (closed) return null;

		if (contact) {
			delete contact[0];
		}

		const address = contact && contact.attributes && contact.attributes.email;

		return (
			<ModalDialog
				onClickOutside={this.cancel}
				overlayClass={style.backdrop}
				class={style.modalContactEditor}
			>
				<div class={style.inner}>
					<header class={style.header}>
						<h2>
							<Text id="contacts.modalEdit.TITLE" />
						</h2>

						<p class={style.description}>
							<Text id="contacts.modalEdit.DESCRIPTION" fields={{ address }} />
						</p>

						<CloseButton class={style.actionButton} onClick={this.cancel} />
					</header>

					<div class={style.content}>
						{contact && (
							<ContactEditor
								class={style.editor}
								contact={contact}
								showCard={false}
								showHeader={false}
								showTitle={false}
								showFooter
								skipMissing={false}
								allowMove
								disabled={saving}
								onBeforeSave={this.beforeSave}
								onSave={this.afterSave}
								onCancel={this.cancel}
								isNew={false}
								footerClass={style.footer}
							/>
						)}
					</div>

					{saving && <Spinner block />}
				</div>
			</ModalDialog>
		);
	}
}
