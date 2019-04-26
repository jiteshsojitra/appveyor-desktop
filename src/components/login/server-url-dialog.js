import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { updateConfig } from '../../config';
import AnimatedButton from '../AnimatedButton';
import TextInput from '../text-input';
import ClientLogo from '../client-logo';
import linkState from 'linkstate';
import style from './style';

export default class ServerUrlDialog extends Component {
	state = {
		validity: {
			serverUrl: true
		},
		url: ''
	};

	submit = () => {
		const { url } = this.state;
		updateConfig('zimbraOrigin', url);

		//Note: don't know what is best way to reload config so choose to reload page
		window.location.reload();
	};

	render({}, { url }) {
		const serverUrl = `server-url`;

		return (
			<div class={style.container}>
				<div class={style.login}>
					<ClientLogo class={style.logo} />

					<h1>
						<Text id="serverConfigDialog.title" />
					</h1>

					<form onSubmit={this.submit} novalidate action="javascript:" method="POST">
						<div class={style.form}>
							<label for={serverUrl}>
								{' '}
								<Text id="serverConfigDialog.serverUrl" />{' '}
							</label>
							<TextInput
								autofocus
								autocorrect="off"
								autocapitalize="off"
								spellcheck="false"
								type="email"
								id={serverUrl}
								value={url}
								onInput={linkState(this, 'url')}
							/>
						</div>
						<div class={style.buttons}>
							<AnimatedButton
								styleType="primary"
								brand="primary"
								type="submit"
								title={<Text id="serverConfigDialog.continue" />}
							/>
						</div>
					</form>
				</div>
			</div>
		);
	}
}
