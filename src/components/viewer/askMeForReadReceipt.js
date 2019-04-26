import { h } from 'preact';
import { Text, MarkupText } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';

import style from './style.less';
import NakedButton from '../naked-button';
import { callWith } from '@zimbra/util/src/call-with';

export default function AskMeForReadReceipt({ senders, sendReadReceipt, closeReceiptModal }) {
	return (
		<div class={style.readReceiptText}>
			<MarkupText
				id="requestReadReceipt.readReceiptRequested"
				fields={{
					name: senders[0].name
				}}
			/>
			&nbsp;
			<span class={style.anchorLink} onClick={callWith(sendReadReceipt)}>
				<Text id="requestReadReceipt.sendReceipt" />
			</span>
			<NakedButton class={style.close} onClick={closeReceiptModal}>
				<Icon name="close" size="sm" />
			</NakedButton>
		</div>
	);
}
