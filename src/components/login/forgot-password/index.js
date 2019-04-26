import { h, Component } from 'preact';
import { configure } from '../../../config';
import { Text, withText } from 'preact-i18n';
import AnimatedButton from '../../AnimatedButton';
import { Button, Spinner } from '@zimbra/blocks';
import TextInput from '../../text-input';
import linkState from 'linkstate';
import cx from 'classnames';
import withLogin from '../../../graphql-decorators/login';
import CodeForm from './code-form';

@configure('clientName')
@withLogin()
@withText({
	emailLabel: 'loginScreen.labels.email'
})
export default class ForgotPassword extends Component {
	shakeButton = () => {
		this.setState({
			loading: false,
			shake: true
		});
	};

	afterShake = () => {
		this.setState({ shake: false });
	};

	submit = () => {
		this.setState({
			email: this.state.username,
			error: false
		});
	};

	submitCode = recoveryCode => {
		const { onCodeSubmit } = this.props;
		const { username } = this.state;

		this.setState({ loading: true });
		this.props
			.login({ username, recoveryCode })
			.then(() => {
				this.setState({ loading: false });
				onCodeSubmit({ username });
			})
			.catch(() => {
				this.setState({
					code: recoveryCode,
					error: <Text id="loginScreen.forgotPass.badCode" />,
					loading: false,
					shake: true
				});
			});
	};

	onError = error => {
		this.setState({
			error,
			loading: false,
			shake: true
		});
	};

	render(
		{ a11yId, clientName, emailLabel, onCancel, style },
		{ code, error, email, loading, shake, username }
	) {
		const emailInputId = `${a11yId}-forgot-email`;
		return loading ? (
			<Spinner block />
		) : (
			<div>
				<div class={cx(style.error, error && style.showing)}>
					<div class={style.inner}>{error}</div>
				</div>

				<div>
					{(email && !error) || code ? (
						<CodeForm
							a11yId={a11yId}
							email={email}
							onError={this.onError}
							style={style}
							submitCode={this.submitCode}
						/>
					) : (
						<div>
							<p>
								<Text id="loginScreen.forgotPass.paragraph" fields={{ domain: clientName }} />
							</p>

							<form onSubmit={this.submit} novalidate action="javascript:" method="POST">
								<div class={style.form}>
									<TextInput
										autofocus
										autocomplete="username email"
										autocorrect="off"
										autocapitalize="off"
										disabled={loading}
										spellcheck="false"
										type="email"
										id={emailInputId}
										onAutoComplete={linkState(this, 'username')}
										onInput={linkState(this, 'username')}
										placeholder={emailLabel}
										value={username}
									/>

									<div class={style.buttonsContainer}>
										<AnimatedButton
											disabled={!username || loading}
											loading={loading}
											styleType="primary"
											class={style.continue}
											brand="primary"
											shake={shake}
											afterShake={this.afterShake}
											type="submit"
											title={<Text id="buttons.continue" />}
										/>

										<Button onClick={onCancel}>
											<Text id="loginScreen.labels.cancel" />
										</Button>
									</div>
								</div>
							</form>
						</div>
					)}
				</div>
			</div>
		);
	}
}
