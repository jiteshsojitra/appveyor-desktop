import { h } from 'preact';
import { Text } from 'preact-i18n';

import s from './style.less';

export default function Title({ text, subtitle }) {
	return (
		<div class={s.container}>
			<span class={s.title}>
				<Text id={text}>{text}</Text>
			</span>
			{subtitle && (
				<span class={s.subtitle}>
					<Text id={subtitle}>{subtitle}</Text>
				</span>
			)}
		</div>
	);
}
