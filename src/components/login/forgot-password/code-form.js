import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import AnimatedButton from '../../AnimatedButton';
import { Button, Spinner } from '@zimbra/blocks';
import TextInput from '../../text-input';
import linkState from 'linkstate';
import { notify } from '../../../store/notifications/actions';
import withGetRecoveryAddress from '../../../graphql-decorators/recover-account/get-recovery-address';
import withSendRecoveryCode from '../../../graphql-decorators/recover-account/send-recovery-code';

@withGetRecoveryAddress()
@withSendRecoveryCode()
@withText({
	codePlaceholder: 'loginScreen.forgotPass.code',
	emailNotFound: 'loginScreen.forgotPass.noEmail',
	genericError: 'app.generalError'
})
export default class CodeForm extends Component {
	shakeButton = () => {
		this.setState({ shake: true });
	};

	afterShake = () => {
		this.setState({ shake: false });
	};

	sendRecoveryCode = ({ displayToast = true }) => {
		const { email, sendCode } = this.props;
		const {
			store: { dispatch }
		} = this.context;
		sendCode(email);

		displayToast &&
			dispatch(
				notify({
					message: <Text id="settings.accountRecovery.resent" />
				})
			);
	};

	submit = () => {
		this.props.submitCode(this.state.code);
	};

	constructor(props) {
		super(props);

		if (!props.account) {
			this.state = { loading: true };
		}
	}

	componentWillReceiveProps(nextProps) {
		const { emailNotFound, genericError, loading, onError } = this.props;

		if (nextProps.loading === false && (loading || this.state.loading)) {
			this.setState({ loading: false });

			if (!nextProps.account) {
				this.shakeButton();
				onError(emailNotFound);
			} else if (nextProps.error) {
				this.shakeButton();
				onError(genericError);
			} else {
				this.sendRecoveryCode({ displayToast: false });
			}
		}
	}

	render({ a11yId, account, codePlaceholder, style }, { code, loading, shake }) {
		const codeInputId = `${a11yId}-forgot-email-code`;

		return loading ? (
			<Spinner block />
		) : (
			<div>
				<p>
					<Text id="loginScreen.forgotPass.found" fields={{ email: account }} />
				</p>

				<form onSubmit={this.submit} novalidate action="javascript:" method="POST">
					<div class={style.form}>
						<TextInput
							autofocus
							autocorrect="off"
							autocapitalize="off"
							disabled={loading}
							spellcheck="false"
							type="text"
							id={codeInputId}
							onInput={linkState(this, 'code')}
							placeholder={codePlaceholder}
							value={code}
						/>

						<div class={style.buttonsContainer}>
							<AnimatedButton
								disabled={!code || loading}
								loading={loading}
								styleType="primary"
								class={style.continue}
								brand="primary"
								shake={shake}
								afterShake={this.afterShake}
								type="submit"
								title={<Text id="buttons.continue" />}
							/>

							<Button onClick={this.sendRecoveryCode}>
								<Text id="buttons.resend" />
							</Button>
						</div>
					</div>
				</form>
			</div>
		);
	}
}
