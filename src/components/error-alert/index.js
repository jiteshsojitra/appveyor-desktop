import { h } from 'preact';
import cx from 'classnames';

import style from './style.less';

export default function ErrorAlert({ children, ...rest }) {
	return (
		<p class={cx(style.error, rest.class)} {...rest}>
			{children}
		</p>
	);
}
