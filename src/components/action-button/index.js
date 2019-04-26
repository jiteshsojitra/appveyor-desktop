import { h } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';

import { Icon } from '@zimbra/blocks';

import s from './style.less';

const ActionButton = ({
	children,
	className,
	iconClass,
	class: cls,
	monotone,
	icon,
	iconOnly,
	iconSize,
	isOffline,
	...rest
}) => (
	<button
		{...rest}
		class={cx(s.button, monotone && s.monotone, className, cls)}
		disabled={isOffline}
	>
		{icon &&
			(typeof icon === 'string' ? (
				<Icon name={icon} class={cx(s.icon, iconClass)} size={iconSize || 'md'} />
			) : (
				icon
			))}
		{!iconOnly && children && children[0] && <span class={s.text}>{children}</span>}
	</button>
);

ActionButton.propTypes = {
	children: PropTypes.node
};

export default ActionButton;
