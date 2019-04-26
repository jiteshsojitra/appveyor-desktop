import { h, Component } from 'preact';
import { Text, MarkupText } from 'preact-i18n';
import cx from 'classnames';
import { Button, Icon, KeyCodes } from '@zimbra/blocks';
import TextInput from '../../text-input';
import { getInputValue, callWith } from '../../../lib/util';
import style from '../style';
import InlineModalDialog from '../../inline-modal-dialog';
import linkstate from 'linkstate';
import withAccountInfo from '../../../graphql-decorators/account-info';
import { withProps } from 'recompose';
import get from 'lodash/get';
import { graphql } from 'react-apollo';
import AddRecoveryAddress from '../../../graphql/queries/accounts/account-add-recovery-address-mutation.graphql';
import ValidateRecoveryAddress from '../../../graphql/queries/accounts/account-validate-recovery-address-mutation.graphql';
import ResendRecoveryCode from '../../../graphql/queries/accounts/account-resend-recovery-code-mutation.graphql';
import ResetRecoveryAddress from '../../../graphql/queries/accounts/account-reset-recovery-address-mutation.graphql';
import AccountInfoQuery from '../../../graphql/queries/preferences/account-info.graphql';
import { connect } from 'preact-redux';
import { showNotificationModal as openNotificationModal } from '../../../store/notification-modal/actions';

@withAccountInfo()
@withProps(({ account }) => ({
	accountRecoveryStatus: get(account, 'prefs.zimbraPrefPasswordRecoveryAddressStatus'),
	recoveryAddress: get(account, 'prefs.zimbraPrefPasswordRecoveryAddress')
}))
@graphql(AddRecoveryAddress, {
	props: ({ mutate }) => ({
		addRecoveryAddress: ({ address }) =>
			mutate({
				variables: {
					recoveryAccount: address
				},
				refetchQueries: [
					{
						query: AccountInfoQuery
					}
				]
			})
	})
})
@graphql(ValidateRecoveryAddress, {
	props: ({ ownProps: { recoveryAddress }, mutate }) => ({
		validateRecoveryAddress: ({ verificationCode }) =>
			mutate({
				variables: {
					recoveryAccount: recoveryAddress,
					recoveryAccountVerificationCode: verificationCode
				},
				refetchQueries: [
					{
						query: AccountInfoQuery
					}
				]
			})
	})
})
@graphql(ResendRecoveryCode, {
	name: 'resendRecoveryCode'
})
@graphql(ResetRecoveryAddress, {
	props: ({ mutate }) => ({
		resetRecoveryAddress: () =>
			mutate({
				refetchQueries: [
					{
						query: AccountInfoQuery
					}
				]
			})
	})
})
@connect(
	null,
	{ showNotificationModal: openNotificationModal }
)
export default class AccountRecoverySettings extends Component {
	state = {
		addingRecovery: false,
		email: null,
		code: ''
	};

	handleModifyRecoveryClick = () => {
		this.setState({ addingRecovery: true });
	};

	handleKeyDown = e => {
		e.keyCode === KeyCodes.CARRIAGE_RETURN && this.handleVerificationSubmit();
	};

	onEmailChange = email => {
		this.setState({ email });
	};

	onCancelHandler = () => {
		this.setState({ addingRecovery: false });
	};

	closeModal = () => {
		this.setState({ showVerificationModal: false, code: '' });
	};

	handleAddressSubmit = () => {
		const email = this.state.email;

		email && email !== this.props.recoveryAddress
			? this.props
					.addRecoveryAddress({ address: email })
					.then(() => {
						this.setState({
							addingRecovery: false,
							showVerificationModal: true,
							addressError: false,
							sameAddress: false,
							maxResends: false
						});
					})
					.catch(() => {
						this.setState({ addressError: true });
					})
			: this.props.recoveryAddress && this.setState({ sameAddress: true });
	};

	handleVerificationSubmit = () => {
		this.props
			.validateRecoveryAddress({ verificationCode: this.state.code })
			.then(() => {
				this.setState({
					showVerificationModal: false,
					code: '',
					recoveryCodeError: false,
					resentCode: false
				});
			})
			.catch(() => {
				this.setState({ recoveryCodeError: true, resentCode: false });
			});
	};

	handleResendVerification = (resentMessage = true) => {
		this.props
			.resendRecoveryCode()
			.then(() => {
				this.setState({
					code: '',
					resentCode: resentMessage,
					recoveryCodeError: false,
					showVerificationModal: true
				});
			})
			.catch(() => {
				this.setState({ maxResends: true, recoveryCodeError: false, resentCode: false });
			});
	};

	handleResetAddress = () => {
		const { resetRecoveryAddress, showNotificationModal } = this.props;
		resetRecoveryAddress().catch(e => {
			console.error(e);
			showNotificationModal({
				message: e
			});
		});
	};

	render(
		{ accountRecoveryStatus, recoveryAddress },
		{
			addingRecovery,
			email,
			showVerificationModal,
			code,
			recoveryCodeError,
			addressError,
			sameAddress,
			resentCode,
			maxResends
		}
	) {
		const verified = accountRecoveryStatus === 'verified';

		return (
			<div class={style.accountRecovery}>
				<div class={style.sectionTitle}>
					<Text id="settings.accountRecovery.title" />
				</div>
				<p>
					<Text id="settings.accountRecovery.addressToUseText" />
				</p>
				{showVerificationModal && (
					<InlineModalDialog
						title="settings.accountRecovery.verifyRecoveryEmail"
						titleClass={style.inlineModalTitle}
						actionLabel="buttons.continue"
						secondaryActionLabel="settings.accountRecovery.buttons.resend"
						onAction={this.handleVerificationSubmit}
						onSecondaryAction={this.handleResendVerification}
						onClose={this.closeModal}
						showCloseBtn={false}
						closeOnClickOutside
						innerClassName={style.inlineModal}
						wrapperClassName={style.inlineModalWrapper}
						toolbarClassName={style.inlineModalToolbar}
						disablePrimary={!code}
					>
						<div>
							<div class={style.verificationMessage}>
								<MarkupText
									id="settings.accountRecovery.verificationText"
									fields={{ recoveryAddress }}
								/>
							</div>
							<TextInput
								name="verificationCode"
								value={code}
								placeholderId="settings.accountRecovery.enterCode"
								onInput={linkstate(this, 'code')}
								required
								wide
								onKeyDown={this.handleKeyDown}
								class={cx(style.codeInput, recoveryCodeError && style.inputError)}
							/>
							{recoveryCodeError && (
								<span class={style.danger}>
									<Text id="settings.accountRecovery.codeError" />
								</span>
							)}
							{resentCode && (
								<span class={style.success}>
									<Text id="settings.accountRecovery.resent" />
								</span>
							)}
							{maxResends && (
								<span class={style.danger}>
									<Text id="settings.accountRecovery.maxResendsReached" />
								</span>
							)}
						</div>
					</InlineModalDialog>
				)}
				{recoveryAddress && !addingRecovery ? (
					<div>
						<div class={cx(style.subsection, style.emailAndStatus)}>
							<div class={cx(style.recoveryEmail, !verified && style.pending)}>
								{recoveryAddress}
							</div>
							<div class={cx(style.status)}>
								{verified ? (
									<div class={style.verified}>
										<Icon class={style.statusIcon} name="check-circle" />
										<Text id="settings.accountRecovery.verified" />
									</div>
								) : (
									<div class={style.pending}>
										<Icon class={style.statusIcon} name="warning" />
										<Text id="settings.accountRecovery.pending" />
									</div>
								)}
							</div>
						</div>
						<div class={style.actionSection}>
							<div class={style.modifyButtons}>
								<Button
									class={cx(style.textButtonBold, style.noLeftSpace)}
									onClick={this.handleModifyRecoveryClick}
									styleType="text"
									brand="primary"
								>
									<Text id="settings.accountRecovery.buttons.changeRecoveryEmail" />
								</Button>
								<Text id="settings.accountRecovery.pipe" />
								<Button onClick={this.handleResetAddress} styleType="text">
									<Text id="settings.accountRecovery.buttons.reset" />
								</Button>
							</div>
							{!verified && (
								<Button
									class={cx(style.textButtonBold, style.noLeftSpace)}
									onClick={callWith(this.handleResendVerification, false)}
									styleType="text"
								>
									<Text id="settings.accountRecovery.buttons.resendVerificationCode" />
								</Button>
							)}
							{maxResends && (
								<span class={style.danger}>
									<Text id="settings.accountRecovery.maxResendsReached" />
								</span>
							)}
						</div>
					</div>
				) : addingRecovery ? (
					<RecoveryForm
						onSubmit={this.handleAddressSubmit}
						onEmailChange={this.onEmailChange}
						email={email || recoveryAddress}
						addressError={addressError}
						cancelHandler={this.onCancelHandler}
						sameAddress={sameAddress}
					/>
				) : (
					<div class={style.actionSection}>
						<Button
							class={cx(style.textButtonBold, style.noLeftSpace)}
							onClick={this.handleModifyRecoveryClick}
							styleType="text"
							brand="primary"
						>
							<Text id="settings.accountRecovery.buttons.addRecovery" />
						</Button>
					</div>
				)}
			</div>
		);
	}
}

class RecoveryForm extends Component {
	changeEmail = e => {
		this.props.onEmailChange(getInputValue(e));
	};

	render({ email, addressError, sameAddress, cancelHandler, onSubmit }) {
		return (
			<form action="javascript:" onSubmit={onSubmit}>
				<div>
					<TextInput
						name="email"
						type="email"
						onChange={this.changeEmail}
						value={email}
						placeholderId="settings.accounts.addAccount.emailPlaceholder"
						required
						wide
						class={style.emailInput}
					/>
				</div>
				{addressError && (
					<span class={style.danger}>
						<Text id="settings.accountRecovery.addressError" />
					</span>
				)}
				{sameAddress && (
					<span class={style.danger}>
						<Text id="settings.accountRecovery.sameAddress" />
					</span>
				)}
				<div>
					<Button class={style.noLeftMargin} type="submit" styleType="primary" brand="primary">
						<Text id="buttons.continue" />
					</Button>
					<Button onClick={cancelHandler}>
						<Text id="buttons.cancel" />
					</Button>
				</div>
			</form>
		);
	}
}
