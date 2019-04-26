import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import AddressField from '../../../address-field';
import ModalDialog from '../../../modal-dialog';
import { SEND_AS, SEND_ON_BEHALF } from '../../../../constants/rights';
import { withGrantRights, withRevokeRights } from '../../../../graphql-decorators/rights';
import linkState from 'linkstate';
import style from './style';

@withGrantRights()
@withRevokeRights()
export default class AddEditDelegatesDialog extends Component {
	state = {
		sendAsRight: this.props.sendAsRight,
		sendOnBehalfOfRight: this.props.sendOnBehalfOfRight,
		value: this.props.value || []
	};

	handleSaveDelegate = () => {
		const {
			sendAsRight: prevSendAsRight,
			sendOnBehalfOfRight: prevSendOnBehalfOfRight,
			onGrantRights,
			onRevokeRights,
			onClose
		} = this.props;

		const {
			value,
			sendAsRight: nextSendAsRight,
			sendOnBehalfOfRight: nextSendOnBehalfOfRight
		} = this.state;

		// If the TokenInput has a contact, it will be an Object. Otherwise use the string value.
		const address = value && (typeof value[0] === 'object' ? value[0].address : value[0]);

		const newGrantRights = [
			!prevSendAsRight && nextSendAsRight && SEND_AS,
			!prevSendOnBehalfOfRight && nextSendOnBehalfOfRight && SEND_ON_BEHALF
		].filter(Boolean);

		const newRevokeRights = [
			prevSendAsRight && !nextSendAsRight && SEND_AS,
			prevSendOnBehalfOfRight && !nextSendOnBehalfOfRight && SEND_ON_BEHALF
		].filter(Boolean);

		if (onGrantRights && newGrantRights.length) {
			onGrantRights(address, newGrantRights);
		}

		if (onRevokeRights && newRevokeRights.length) {
			onRevokeRights(address, newRevokeRights);
		}

		onClose();
	};

	render({ onClose, disableInput }, { value, sendAsRight, sendOnBehalfOfRight }) {
		const disabled = !(sendAsRight || sendOnBehalfOfRight) || !value[0];
		return (
			<ModalDialog
				onClose={onClose}
				onAction={this.handleSaveDelegate}
				disablePrimary={disabled}
				title="settings.writingEmail.delegates.delegatePermissions"
			>
				<p>
					<Text id="settings.writingEmail.delegates.usersHaveDelegated" />
				</p>
				<AddressField
					isGalOnly
					maxTokens={1}
					tokenInputClass={style.tokenInput}
					value={value}
					onChange={linkState(this, 'value', 'value')}
					disabled={disableInput}
				/>

				<table class={style.checkboxes} role="presentation">
					<tbody>
						<tr>
							<td>
								<input
									id="sendAs"
									type="checkbox"
									checked={!!sendAsRight}
									onInput={linkState(this, 'sendAsRight')}
									onChange={linkState(this, 'sendAsRight')}
								/>
								<label for="sendAs">
									<Text id="settings.writingEmail.delegates.delegateSendAs" />
								</label>
							</td>
						</tr>

						<tr>
							<td>
								<input
									id="sendOnBehalfOf"
									type="checkbox"
									checked={!!sendOnBehalfOfRight}
									onInput={linkState(this, 'sendOnBehalfOfRight')}
									onChange={linkState(this, 'sendOnBehalfOfRight')}
								/>
								<label for="sendOnBehalfOf">
									<Text id="settings.writingEmail.delegates.delegateSendOnBehalfOf" />
								</label>
							</td>
						</tr>
					</tbody>
				</table>
			</ModalDialog>
		);
	}
}
