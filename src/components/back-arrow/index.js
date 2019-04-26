import { h } from 'preact';
import { Localizer, Text } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';
import style from './style';
import cx from 'classnames';

export default function BackArrow({ iconProps = {}, ...props }) {
	return (
		<Localizer>
			<button
				aria-label={<Text id="buttons.close" />}
				{...props}
				class={cx(style.button, props.class)}
			>
				<Icon name="arrow-left" {...iconProps} />
			</button>
		</Localizer>
	);
}
