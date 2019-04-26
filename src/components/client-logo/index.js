import { h } from 'preact';
import style from './style';
import cx from 'classnames';
import Markup from 'preact-markup';
import { Text, Localizer } from 'preact-i18n';

export default (function getLogo() {
	try {
		const html = require(`!!svg-inline-loader!../../../clients/${CLIENT}/assets/logo.svg`);
		try {
			const loginhtml = require(`!!svg-inline-loader!../../../clients/${CLIENT}/assets/loginlogo.svg`);
			return function ClientLogo(props) {
				if (props.isLoginPage) {
					return (
						<span {...props} class={cx(style.logo, props.class)}>
							<Markup markup={loginhtml} />
						</span>
					);
				}
				return (
					<span {...props} class={cx(style.logo, props.class)}>
						<Markup markup={html} />
					</span>
				);
			};
		} catch (e) {
			return function ClientLogo(props) {
				return (
					<span {...props} class={cx(style.logo, props.class)}>
						<Markup markup={html} />
					</span>
				);
			};
		}
	} catch (e) {
		console.warn(`Could not find "${CLIENT}/assets/logo.svg": `, e);
		return function ClientLogoError() {
			return (
				<Localizer>
					<img alt={<Text id="app.errors.logo_missing" />} height="30" />
				</Localizer>
			);
		};
	}
})();
