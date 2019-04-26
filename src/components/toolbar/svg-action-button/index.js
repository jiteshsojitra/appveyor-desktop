import { h } from 'preact';
import { Link } from 'preact-router/match';
import { Icon } from '@zimbra/blocks';
import s from './style.less';

import cx from 'classnames';

export default function SVGActionButton({ className, href, iconClass, onClick }) {
	return href ? (
		<Link href={href} class={cx(s.button, className)}>
			<Icon name={iconClass} class={s.icon} />
		</Link>
	) : (
		<div onClick={onClick} class={cx(s.button, className)}>
			<Icon name={iconClass} class={s.icon} />
		</div>
	);
}
