import { h } from 'preact';
import { Icon } from '@zimbra/blocks';
import cx from 'classnames';
import style from './style';

export default function ToolbarButton({ active, icon, children, ...props }) {
	return (
		<button {...props} class={cx(style.toolbarButton, active && style.active, props.class)}>
			{icon && typeof icon === 'string' ? <Icon name={icon} /> : icon}
			{children}
		</button>
	);
}
