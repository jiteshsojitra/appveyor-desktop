import { h } from 'preact';
import cx from 'classnames';

import MenuItem from '../menu-item';

import s from './style.less';
function stopPropagation(e) {
	e.stopPropagation();
}

export default function ActionMenuItem({
	class: cls,
	className,
	iconClass,
	onClick,
	narrow,
	...rest
}) {
	return (
		<MenuItem
			{...rest}
			class={cx(s.item, className, cls, narrow && s.narrow, rest.disabled && s.disabled)}
			iconClass={cx(s.icon, iconClass)}
			onClick={rest.disabled ? stopPropagation : onClick}
		/>
	);
}
