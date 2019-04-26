import { h } from 'preact';
import { Scrim, Icon } from '@zimbra/blocks';
import Centered from '../../../centered';
import style from './style';
import cx from 'classnames';
import { Text } from 'preact-i18n';

function CenteredScrim({ children, ...props }) {
	return (
		<Scrim {...props} class={cx(style.scrim, props.class)}>
			<Centered>{children}</Centered>
		</Scrim>
	);
}

export function EmbedScrim(props) {
	return (
		<CenteredScrim {...props} class={cx(style.embed, props.class)}>
			<div>
				<Icon name="image" />
			</div>
			<Text id="compose.textarea.imageDrop" />
		</CenteredScrim>
	);
}

export function AttachScrim(props) {
	return (
		<CenteredScrim {...props} class={cx(style.attach, props.class)}>
			<Icon name="paperclip" />
			<Text id="compose.textarea.attachDrop" />
		</CenteredScrim>
	);
}
