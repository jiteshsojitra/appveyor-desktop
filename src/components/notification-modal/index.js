import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import ModalDialog from '../modal-dialog';
import { Button, Icon } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import { getNotificationData } from '../../store/notification-modal/selectors';
import * as notificationModalActions from '../../store/notification-modal/actions';
import style from './style.less';
import NakedButton from '../naked-button';
import { errorMessage, faultCode } from '../../utils/errors';
import clipboard from 'clipboard-polyfill';
import { callWith } from '../../lib/util';
import cx from 'classnames';
const getStack = ({ message, stack }) => {
	if (stack.indexOf(message) > -1) {
		return stack;
	}
	return `Error: ${message}
	${stack}`;
};

@connect(
	state => ({
		notification: getNotificationData(state)
	}),
	dispatch => ({
		closeNotifyModal: () => dispatch(notificationModalActions.closeNotifyModal())
	})
)
export default class NotificationModal extends Component {
	static propTypes = {
		closeNotifyModal: PropTypes.func.isRequired,
		notification: PropTypes.object
	};

	handleClose = e => {
		e.stopPropagation();
		this.setState({ showDetails: false, copied: false });
		this.props.closeNotifyModal();
	};

	toggleDetails = e => {
		e.stopPropagation();
		const { showDetails, copied } = this.state;
		this.setState({ showDetails: !showDetails, ...(copied && { copied: false }) });
	};

	copyToClipboard = textToCopy => {
		clipboard.writeText(textToCopy).then(() => this.setState({ copied: true }));
	};

	getError = e => {
		let error = (e.stack && getStack(e)) || errorMessage(e) || faultCode(e);
		if (!error) {
			const newError = new Error(e);
			error = newError.stack;
		}
		return error;
	};

	componentWillUnmount() {
		this.props.closeNotifyModal();
	}

	render({ notification }, { showDetails, copied }) {
		const errorToDisplay =
			notification && notification.message && this.getError(notification.message);
		return (
			notification &&
			notification.message && (
				<ModalDialog
					autofocusChildIndex={1}
					class={style.notificationModal}
					contentClass={cx(style.notificationModalContent, showDetails && style.showDetails)}
					title={`notificationModal.title`}
					buttons={[
						<Button styleType="primary" brand="primary" onClick={this.handleClose}>
							<Text id="buttons.ok" />
						</Button>
					]}
					cancelButton={false}
					onClickOutside={this.handleClose}
				>
					<div class={style.actions}>
						<Button onClick={this.toggleDetails} styleType="text">
							<Text id={`notificationModal.${showDetails ? 'hide' : 'show'}Details`} />
						</Button>

						{showDetails && (
							<NakedButton
								class={style.clipboardBtn}
								id="clipboard-btn"
								onClick={callWith(this.copyToClipboard, errorToDisplay)}
							>
								<Icon name="copy-to-clipboard" />
								<Text id={`notificationModal.${copied ? 'copied' : 'copyToClipboard'}`} />
							</NakedButton>
						)}
					</div>

					{showDetails && <div class={style.message}>{errorToDisplay}</div>}
				</ModalDialog>
			)
		);
	}
}
