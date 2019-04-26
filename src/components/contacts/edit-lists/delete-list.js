import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { route } from 'preact-router';
import { types as apiClientTypes } from '@zimbra/api-client';
import ModalDialog from '../../modal-dialog';
import { connect } from 'preact-redux';
import { notify } from '../../../store/notifications/actions';
import { showNotificationModal as openNotificationModal } from '../../../store/notification-modal/actions';
import withContactAction from '../../../graphql-decorators/contact/contact-action';

const { ActionOps } = apiClientTypes;

@withContactAction()
@connect(
	null,
	{ notify, showNotificationModal: openNotificationModal }
)
export default class DeleteList extends Component {
	delete = () => {
		const {
			contactAction,
			afterAction,
			onClose,
			folder,
			urlSlug,
			urlPrefix,
			urlSuffixProp,
			notify: notifyAction,
			showNotificationModal
		} = this.props;

		contactAction({
			id: folder.id,
			op: ActionOps.trash
		})
			.then(({ data: { contactAction: actionResponse } }) => {
				notifyAction({
					message: <Text id="contacts.trash.list.one" fields={{ name: folder.name }} />
				});

				afterAction && afterAction(actionResponse.action);
			})
			.catch(err => {
				console.error(err);
				showNotificationModal({
					message: err
				});
			});

		const urlSuffix =
			(urlSuffixProp && folder[urlSuffixProp]) ||
			encodeURIComponent(
				(folder.absFolderPath && folder.absFolderPath.replace(/(^\/|\/$)/, '')) ||
					folder.name ||
					folder.id
			);
		const urlRegex = new RegExp(`/${urlSlug}/${urlPrefix || ''}${urlSuffix}($|/)`);
		const isActive = urlRegex.test(window.location.href);

		if (onClose) onClose();
		if (isActive) route(`/${urlSlug}`);
	};

	onClose = () => {
		const { onClose } = this.props;
		if (onClose) onClose();
	};

	render() {
		const { folder } = this.props;

		return (
			<ModalDialog
				title={
					<Text id="contacts.dialogs.deleteList.DIALOG_TITLE" fields={{ name: folder.name }} />
				}
				onAction={this.delete}
				onClose={this.onClose}
			>
				<p>
					<Text id="contacts.dialogs.deleteList.DESCRIPTION" fields={{ name: folder.name }} />
				</p>
			</ModalDialog>
		);
	}
}
