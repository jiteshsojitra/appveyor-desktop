import { h } from 'preact';
import { Spinner } from '@zimbra/blocks';
import cx from 'classnames';
import style from './style';
import { Text } from 'preact-i18n';

export const AppShell = props => (
	<div {...props} id="zm-x-web" class={cx(style.app, props.class)} />
);

export const Loader = () => (
	<AppShell>
		<div class={style.loading}>
			<Spinner class={style.spinner} />
			<div class={style.text}>
				<Text id="app.loading" />
			</div>
		</div>
	</AppShell>
);

export default Loader;
