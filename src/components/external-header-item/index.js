import { h } from 'preact';
import s from './style.less';

export default function ExternalHeaderItem({ children, ...rest }) {
	return (
		<a target="_blank" rel="noopener noreferrer" class={s.externalHeaderItem} {...rest}>
			{children}
		</a>
	);
}
