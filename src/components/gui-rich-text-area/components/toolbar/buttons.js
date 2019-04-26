import { h } from 'preact';
import { Text } from 'preact-i18n';
import { CommandButton } from './command-button';
import cx from 'classnames';
import styles from './style';
import { Button, Spinner } from '@zimbra/blocks';

/*** Suppress plaintext composer - PREAPPS-1366
export function ToggleTextModeButton({ isPlainText, ...props }) {
	return (
		<CommandButton
			{...props}
			title={`togglePlaintext.${String(Boolean(isPlainText))}`}
			icon={`angle-double-${isPlainText ? 'right': 'left'}`}
		/>
	);
}
**/

export function TrashButton(props) {
	return (
		<CommandButton
			{...props}
			title={'deleteDraft'} // eslint-disable-line preact-i18n/no-text-as-attribute
			class={cx(styles.delete, props.class)}
			icon="trash"
		/>
	);
}

export function SendButton({ disabled, loading, ...props }) {
	return (
		<Button
			{...props}
			class={cx(styles.send, props.class)}
			disabled={loading || disabled}
			styleType="primary"
			brand="primary"
		>
			<Text id="buttons.send" />
			<span>{loading && <Spinner dark />}</span>
		</Button>
	);
}
