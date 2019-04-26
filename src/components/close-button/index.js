import { h } from 'preact';
import { Icon } from '@zimbra/blocks';
import { Text, Localizer } from 'preact-i18n';
import cx from 'classnames';
import style from './style.less';

export default function CloseButton(props) {
	return (
		<Localizer>
			<button
				aria-label={<Text id="buttons.close" />}
				{...props}
				class={cx(style.close, props.class)}
			>
				<Icon name="close" />
			</button>
		</Localizer>
	);
}
