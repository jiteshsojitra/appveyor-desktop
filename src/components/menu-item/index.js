import { h } from 'preact';
import cx from 'classnames';
import { Match } from 'preact-router/match';
import escapeStringRegexp from 'escape-string-regexp';
import { Icon } from '@zimbra/blocks';
import style from './style';

export default function MenuItem({
	customClass,
	activeClass,
	iconClass,
	innerClass,
	match,
	icon,
	iconPosition = 'left',
	iconText,
	responsive,
	children,
	sidebarEnable,
	...props
}) {
	if (match && typeof match === 'string') {
		match = new RegExp('^' + escapeStringRegexp(match));
	}

	return (
		<Match path={props.href}>
			{({ matches, url }) => (
				<a
					{...props}
					class={cx(
						!customClass && style.navItem,
						icon && (iconPosition === 'right' ? style.iconRight : style.iconLeft),
						customClass !== true && customClass,
						props.class,
						responsive && style.responsive,
						props.disabled && style.disabled,
						(matches || (match && match.test(url))) && cx(style.active, activeClass),
						sidebarEnable && style.sidebarEnable
					)}
				>
					{icon && (
						<span class={cx(iconClass || style.icon, props.disabled && style.iconDisabled)}>
							{typeof icon === 'string' ? <Icon name={icon} /> : icon}
							{iconText && <span class={style.iconText}>{iconText}</span>}
						</span>
					)}
					<span class={cx(style.inner, innerClass)}>{children}</span>
				</a>
			)}
		</Match>
	);
}
