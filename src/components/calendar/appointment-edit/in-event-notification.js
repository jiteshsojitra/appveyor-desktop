import { h } from 'preact';
import { Text } from 'preact-i18n';

import style from './style.less';
import { callWith } from '@zimbra/util/src/call-with';

export default function InEventNotification({ onLinkClick, notificationText, linkText }) {
	return (
		<div class={style.inEventNotification}>
			<Text id={notificationText} />
			&nbsp;
			<button class={style.anchorLink} onClick={callWith(onLinkClick, true)}>
				<Text id={linkText} />
			</button>
		</div>
	);
}
