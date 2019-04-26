import { h, Component } from 'preact';
import cx from 'classnames';
import { Text } from 'preact-i18n';
import get from 'lodash/get';

import { callWith } from '../../../lib/util';

import { Button, ChoiceInput } from '@zimbra/blocks';
import Select from '../../select';
import ErrorAlert from '../../error-alert';
import MobileConfig from './mobile-config';

import style from '../style';

class EditAccountView extends Component {
	triggerUpdateAccountSettings = property => e => {
		if (e.target.type === 'checkbox') {
			this.props.updateAccountSettings(
				{ [property]: e.target.checked },
				this.props.selectedAccountId
			);
		} else {
			this.props.updateAccountSettings(
				{
					[property]: e.target.value
				},
				this.props.selectedAccountId
			);
		}
	};

	render = ({
		selectedAccount: {
			name,
			fromDisplay,
			replyToAddress,
			replyToDisplay,
			replyToEnabled,
			isPrimaryAccount,
			emailAddress,
			failingSince,
			lastError
		},
		mailForwardingAddress,
		mailLocalDeliveryDisabled,
		mailForwardingExampleAddress,
		handleMailForwardingActiveChange,
		showMailForwardingAddress,
		onFieldChange,
		switchView
	}) => (
		<div class={style.accountSubsection}>
			<div class={style.subsectionBody}>
				{failingSince && (
					<ErrorAlert>
						{get(lastError, '_content') || <Text id="settings.accounts.errors.existingIsFailing" />}
					</ErrorAlert>
				)}
				<div class={style.editAccountTitle}>{emailAddress}</div>
				<div class={style.sectionTitle}>
					<Text id="settings.accounts.editAccount.fromDisplay" />
				</div>
				<label class={style.addAccountLabel}>
					<input
						type="text"
						onChange={callWith(this.triggerUpdateAccountSettings, 'fromDisplay')()}
						value={fromDisplay}
						class={cx(style.textInput, style.addAccountInput)}
					/>
					<div class={style.helperText}>
						<Text id="settings.accounts.editAccount.fromDisplayHelper" />
					</div>
				</label>
				<div class={style.sectionTitle}>
					<Text id="settings.accounts.editAccount.description" />
				</div>
				<label class={style.addAccountLabel}>
					<input
						type="text"
						onChange={callWith(this.triggerUpdateAccountSettings, 'name')()}
						value={name}
						class={cx(style.textInput, style.addAccountInput)}
					/>
					<div class={style.helperText}>
						<Text id="settings.accounts.editAccount.descriptionHelper" />
					</div>
				</label>
				<div class={style.addAccountSubsection}>
					<div class={style.sectionTitle}>
						<Text id="settings.accounts.editAccount.replyToAddressSection" />
					</div>
					<label class={style.compactCheckboxSection}>
						<ChoiceInput
							onChange={callWith(this.triggerUpdateAccountSettings, 'replyToEnabled')()}
							checked={replyToEnabled}
						/>
						<Text id="settings.accounts.editAccount.replyToAddressEnabled" />
					</label>
					{replyToEnabled && (
						<div>
							<div class={cx(style.subsection, style.compact)}>
								<div class={cx(style.subsectionTitle, style.infoLabel)}>
									<Text id="settings.accounts.editAccount.replyToAddress" />
								</div>
								<div class={style.subsectionBody}>
									<input
										type="email"
										onChange={callWith(this.triggerUpdateAccountSettings, 'replyToAddress')()}
										value={replyToAddress}
										class={cx(style.textInput, style.infoInput)}
									/>
								</div>
							</div>
							<div class={style.subsection}>
								<div class={cx(style.subsectionTitle, style.infoLabel)}>
									<Text id="settings.accounts.editAccount.replyToDisplay" />
								</div>
								<div class={style.subsectionBody}>
									<input
										type="email"
										onChange={callWith(this.triggerUpdateAccountSettings, 'replyToDisplay')()}
										value={replyToDisplay}
										class={cx(style.textInput, style.infoInput)}
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			{isPrimaryAccount && [
				<div class={style.primaryAccountSection}>
					<div class={style.sectionTitle}>
						<Text id="settings.accounts.mailForwardingTitle" />
					</div>
					<label class={style.compactCheckboxSection}>
						<ChoiceInput
							onChange={handleMailForwardingActiveChange}
							checked={showMailForwardingAddress}
						/>
						<Text id="settings.accounts.mailForwardingLabel" />
					</label>
					{showMailForwardingAddress && (
						<div class={style.subsectionBody}>
							<div class={cx(style.subsection, style.compact)}>
								<input
									type="text"
									class={cx(style.textInput, style.block)}
									placeholder={mailForwardingExampleAddress}
									value={mailForwardingAddress}
									onChange={onFieldChange('mailForwardingAddress')}
								/>
							</div>
						</div>
					)}
					{showMailForwardingAddress && (
						<div class={style.subsectionBody}>
							<Select
								value={mailLocalDeliveryDisabled}
								onChange={onFieldChange('mailLocalDeliveryDisabled')}
								fullWidth
							>
								<option value="false">
									<Text id="settings.accounts.editAccount.storeAndForward" />
								</option>
								<option value="true">
									<Text id="settings.accounts.editAccount.deleteAndForward" />
								</option>
							</Select>
						</div>
					)}
				</div>,
				<MobileConfig />
			]}
			{!isPrimaryAccount && (
				<div class={style.subsectionBody}>
					<Button
						styleType="primary"
						brand="danger"
						onClick={callWith(switchView, ['confirmRemoval'])}
						alignLeft
					>
						<Text id="buttons.removeMailbox" />
					</Button>
					<div class={style.confirmationSpan}>
						<Text id="settings.accounts.editAccount.removeMailboxHelper" />
					</div>
				</div>
			)}
		</div>
	);
}

export default EditAccountView;
