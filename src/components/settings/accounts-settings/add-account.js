import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import cx from 'classnames';

import { callWith, isValidEmail } from '../../../lib/util';
import mailPort from '../../../utils/mail-port';
import { errorMessage, faultCode } from '../../../utils/errors';

import { Spinner, Button, ChoiceInput } from '@zimbra/blocks';
import AlignedForm from '../../aligned-form';
import AlignedLabel from '../../aligned-form/label';
import AnimatedCheckmark from '../../animated-checkmark';
import CollapsibleControl from '../../collapsible-control';
import ErrorAlert from '../../error-alert';
import FormGroup from '../../form-group';
import Label from '../../label';
import TextInput from '../../text-input';

import { withTestExternalAccount } from '../../../graphql-decorators/external-account';

import style from '../style';

const ERRORS = {
	'LOGIN failed': 'settings.accounts.errors.loginFailed',
	'LOGIN Invalid credentials': 'settings.accounts.errors.invalidCredentials',
	generic: 'settings.accounts.errors.generic'
};

const SuccessfulConnectionMessage = ({ email, onAdd }) => (
	<div class={style.testSuccessMessageContainer}>
		<div class={cx(style.testingDataSourceSection, style.animatedCheckmark)}>
			<AnimatedCheckmark class={style.check} />
		</div>
		<div class={cx(style.testingDataSourceSection, style.successMessage)}>
			<Text id="settings.accounts.addAccount.successfulConnection" />
		</div>
		<Button onClick={onAdd} styleType="primary" brand="primary">
			<Text id="buttons.add" /> <b>{email}</b>
		</Button>
	</div>
);

@withText('faults.account.DATA_SOURCE_EXISTS')
@withTestExternalAccount()
export default class AddAccount extends Component {
	state = {
		additionalSettingsCollapsed: true,
		dataSourceTestError: null,
		dataSourceTestInProgress: false,
		dataSourceTestSuccess: false,
		submissionError: null,
		submitting: false
	};

	handleToggle = () =>
		this.setState({
			additionalSettingsCollapsed: !this.state.additionalSettingsCollapsed
		});

	changeEmail = e => {
		this.props.onFormDataChange('emailAddress')(e);

		if (isValidEmail(e.target.value)) {
			const [username] = e.target.value.split('@');
			this.props.onFormDataChange('username')(username);
		}
	};

	handleTestDataSource = e => {
		e.preventDefault();
		const {
			accountType,
			host,
			leaveOnServer,
			password,
			port: customPort,
			username,
			useCustomPort,
			useSSL
		} = this.props.formData;
		const port = useCustomPort ? customPort : mailPort(accountType, useSSL);

		this.setState({
			dataSourceTestInProgress: true,
			dataSourceTestSuccess: false,
			dataSourceTestError: null,
			submissionError: null
		});

		this.props
			.testExternalAccount({
				accountType,
				host,
				leaveOnServer,
				password,
				port,
				username,
				connectionType: useSSL ? 'ssl' : 'cleartext'
			})
			.then(({ data: { testExternalAccount: { success, error } } }) => {
				if (success) {
					this.setState({
						dataSourceTestInProgress: false,
						dataSourceTestSuccess: true,
						dataSourceTestError: null
					});
				} else {
					this.setState({
						dataSourceTestInProgress: false,
						dataSourceTestSuccess: false,
						dataSourceTestError: ERRORS[error || 'generic'] || ERRORS.generic
					});
				}
			})
			.catch(() => {
				this.setState({
					dataSourceTestInProgress: false,
					dataSourceTestSuccess: false,
					dataSourceTestError: ERRORS.generic
				});
			});
	};

	handleAddAccount = () => {
		this.setState({
			dataSourceTestInProgress: false,
			dataSourceTestSuccess: false,
			dataSourceTestError: null,
			submitting: true,
			submissionError: null
		});

		this.props
			.onSubmit({ formData: this.props.formData })
			.then(() => {
				this.setState({
					submitting: false
				});
			})
			.catch(err => {
				const errCode = faultCode(err);

				this.setState({
					submitting: false,
					submissionError:
						errCode === 'account.DATA_SOURCE_EXISTS'
							? this.props.DATA_SOURCE_EXISTS
							: errorMessage(err)
				});
			});
	};

	handleEndDataSourceTest = () => {
		this.setState({
			dataSourceTestInProgress: false
		});
	};

	handleFixErrors = () => {
		this.setState({
			dataSourceTestInProgress: false
		});
	};

	handleChangeAccountType = type => {
		const { formData, onFormDataChange } = this.props;
		onFormDataChange('accountType')(type);
		onFormDataChange('port')(mailPort(type, formData.useSSL));
	};

	handleCustomFolderToggle = () => {
		this.props.onFormDataChange('useCustomFolder')(!this.props.formData.useCustomFolder);
	};

	handleToggleUseSSL = () => {
		const { formData, onFormDataChange } = this.props;
		const value = !formData.useSSL;
		onFormDataChange('useSSL')(value);
		onFormDataChange('port')(mailPort(formData.accountType, value));
	};

	handleToggleDeleteOnServer = () => {
		this.props.onFormDataChange('leaveOnServer')(!this.props.formData.leaveOnServer);
	};

	render(
		{ onFormDataChange, formData, errorIds },
		{
			additionalSettingsCollapsed,
			dataSourceTestInProgress,
			dataSourceTestSuccess,
			dataSourceTestError,
			submissionError,
			submitting
		}
	) {
		const error = submissionError || dataSourceTestError;

		return dataSourceTestInProgress || dataSourceTestSuccess || submitting ? (
			<div class={style.testingDataSourceContainer}>
				{dataSourceTestSuccess ? (
					<SuccessfulConnectionMessage
						email={formData.emailAddress}
						onAdd={this.handleAddAccount}
					/>
				) : dataSourceTestInProgress ? (
					<div>
						<div class={style.testingDataSourceSection}>
							<Spinner class={style.spinner} />
						</div>
						<div class={cx(style.testingDataSourceSection)}>
							<b>
								<Text
									id="settings.accounts.addAccount.connectingMessage"
									fields={{ email: formData.emailAddress }}
								/>
							</b>
						</div>
					</div>
				) : (
					<div class={style.testingDataSourceSection}>
						<Spinner class={style.spinner} />
					</div>
				)}
			</div>
		) : (
			<form action="javascript:" onSubmit={this.handleTestDataSource}>
				{error && (
					<ErrorAlert>
						<Text id={error}>{error}</Text>
					</ErrorAlert>
				)}
				<div class={cx(style.subsectionBody, style.mb1_5)}>
					<FormGroup rows>
						<Label id="settings.accounts.addAccount.email" for="email" large />
						<TextInput
							name="email"
							type="email"
							onChange={this.changeEmail}
							value={formData.emailAddress}
							placeholderId="settings.accounts.addAccount.emailPlaceholder"
							required
							wide
						/>
					</FormGroup>
					<FormGroup rows large separator>
						<Label id="settings.accounts.addAccount.password" for="password" large />
						<TextInput
							name="password"
							type="password"
							onChange={callWith(onFormDataChange, 'password')()}
							value={formData.password}
							placeholderId="settings.accounts.addAccount.passwordPlaceholder"
							required
							wide
						/>
					</FormGroup>
				</div>
				<div class={style.subsectionBody}>
					<AlignedForm>
						<FormGroup>
							<AlignedLabel
								align="left"
								width="130px"
								textId="settings.accounts.addAccount.typeSubsection"
							/>
							<div>
								<label class={style.inlineRadioButton}>
									<ChoiceInput
										type="radio"
										name="accountType"
										value="imap"
										onChange={callWith(this.handleChangeAccountType, 'imap')}
										checked={formData.accountType === 'imap'}
									/>
									<Text id="settings.accounts.addAccount.imap" />
								</label>
								<label class={style.inlineRadioButton}>
									<ChoiceInput
										type="radio"
										name="accountType"
										value="pop3"
										onChange={callWith(this.handleChangeAccountType, 'pop3')}
										checked={formData.accountType === 'pop3'}
									/>
									<Text id="settings.accounts.addAccount.pop" />
								</label>
							</div>
						</FormGroup>
						<FormGroup compact>
							<AlignedLabel
								align="left"
								width="130px"
								textId="settings.accounts.addAccount.username"
							/>
							<TextInput
								onChange={callWith(onFormDataChange, 'username')()}
								value={formData.username}
								placeholderId="settings.accounts.addAccount.namePlaceholder"
								required
								class={cx(style.textInput, style.infoInput)}
							/>
						</FormGroup>
						<FormGroup>
							<AlignedLabel align="left" width="130px" textId="settings.accounts.addAccount.host" />
							<input
								placeholder={
									formData.accountType === 'imap' ? 'imap.mail.example.com' : 'pop.mail.example.com'
								}
								onChange={callWith(onFormDataChange, 'host')()}
								value={formData.host}
								class={cx(style.textInput, style.infoInput)}
								type="text"
								required
							/>
						</FormGroup>
						<FormGroup onClick={this.handleToggle} class={style.advancedToggle}>
							<CollapsibleControl collapsed={additionalSettingsCollapsed} />
							<Text id="settings.accounts.addAccount.advancedSettings" />
						</FormGroup>
					</AlignedForm>
					{!additionalSettingsCollapsed && (
						<AlignedForm>
							<FormGroup>
								<AlignedLabel align="left" width="130px">
									<ChoiceInput
										onChange={callWith(onFormDataChange, 'useCustomPort')()}
										checked={formData.useCustomPort}
									/>
									<Text id="settings.accounts.addAccount.changePort" />
								</AlignedLabel>
								<div class={style.inputWithRightHint}>
									<input
										value={
											formData.useCustomPort
												? formData.port
												: mailPort(formData.accountType, formData.useSSL)
										}
										onChange={callWith(onFormDataChange, 'port')()}
										class={cx(style.textInput, style.portInput)}
										type="number"
										min="1"
										max="65534"
										disabled={!formData.useCustomPort}
									/>
									<div class={style.rightHint}>
										<Text
											id="settings.accounts.addAccount.portHint"
											fields={{
												portNum: mailPort(formData.accountType, formData.useSSL)
											}}
										/>
									</div>
								</div>
							</FormGroup>
							<FormGroup>
								<AlignedLabel align="left" width="100%">
									<ChoiceInput onChange={this.handleToggleUseSSL} checked={formData.useSSL} />
									<Text id="settings.accounts.addAccount.useSSL" />
								</AlignedLabel>
							</FormGroup>
							{formData.accountType === 'pop3' && (
								<div class={style.w100}>
									<div class={style.sectionTitle}>
										<Text id="settings.accounts.addAccount.downloadDestination" />
									</div>
									<FormGroup compact>
										<label>
											<ChoiceInput
												type="radio"
												name="folder"
												onChange={this.handleCustomFolderToggle}
												checked={formData.useCustomFolder}
											/>
											<Text id="settings.accounts.addAccount.downloadFolderLabel" />
											<div class={style.downloadFolderName}>
												{formData.username || (
													<span class={style.downloadFolderPlaceholder}>
														<Text id="settings.accounts.addAccount.downloadFolderPlaceholder" />
													</span>
												)}
											</div>
										</label>
									</FormGroup>
									<FormGroup separator>
										<label>
											<ChoiceInput
												type="radio"
												name="folder"
												onChange={this.handleCustomFolderToggle}
												checked={!formData.useCustomFolder}
											/>
											<Text id="settings.accounts.addAccount.inbox" />
										</label>
									</FormGroup>
									<FormGroup>
										<label>
											<ChoiceInput
												onChange={this.handleToggleDeleteOnServer}
												checked={!formData.leaveOnServer}
											/>
											<Text id="settings.accounts.addAccount.popDeleteFromServer" />
										</label>
									</FormGroup>
								</div>
							)}
						</AlignedForm>
					)}
					<Button class={style.plainButton} disabled={errorIds.length !== 0} type="submit">
						<Text id="buttons.continue" />
					</Button>
				</div>
			</form>
		);
	}
}
