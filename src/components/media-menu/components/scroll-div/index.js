import { h } from 'preact';
import style from './style';
import cx from 'classnames';

export default function ScrollDiv({ children, innerProps = {}, outerProps = {} }) {
	return (
		<div {...outerProps} class={cx(style.outer, outerProps.class)}>
			<div {...innerProps} class={cx(style.inner, innerProps.class)}>
				{children}
			</div>
		</div>
	);
}
