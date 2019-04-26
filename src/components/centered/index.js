import { h } from 'preact';
import style from './style';
import cx from 'classnames';

export default function Centered({ children, outerProps = {}, innerProps = {} }) {
	return (
		<div {...outerProps} class={cx(style.outer, outerProps.class, outerProps.className)}>
			<div {...innerProps} class={cx(style.inner, innerProps.class, innerProps.className)}>
				{children}
			</div>
		</div>
	);
}
