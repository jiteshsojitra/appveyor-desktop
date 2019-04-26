import { h } from 'preact';
import NakedButton from '../naked-button';
import { Icon } from '@zimbra/blocks';
import { Text } from 'preact-i18n';

import s from './style.less';

export default function CondensedMessageOverflowIndicator({ count, onClick }) {
	return (
		<div class={s.container}>
			<NakedButton onClick={onClick} class={s.button}>
				<Icon name="plus" class={s.icon} size="sm" />
				<span class={s.label}>
					<Text id="mail.viewer.numMoreMessages" plural={count} fields={{ count }} />
				</span>
			</NakedButton>
		</div>
	);
}
