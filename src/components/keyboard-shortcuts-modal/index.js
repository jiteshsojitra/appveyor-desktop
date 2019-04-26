import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { showKeyboardShortcuts, hideKeyboardShortcuts } from '../../store/settings/actions';
import ModalDialog from '../modal-dialog';
import { Text } from 'preact-i18n';
import style from './style';
import withCommandHandlers from '../../keyboard-shortcuts/with-command-handlers';

@connect(
	state => ({
		visible: state.settings.keyboardShortcutsVisible
	}),
	{
		show: showKeyboardShortcuts,
		hide: hideKeyboardShortcuts
	}
)
@withCommandHandlers(props => [
	{ context: 'all', command: 'SHOW_KEYBOARD_SHORTCUTS', handler: props.show }
])
export default class KeyboardShortcutsModal extends Component {
	render({ visible, hide }, state, { shortcutCommandHandler }) {
		if (!visible) return;

		const shortcuts = shortcutCommandHandler.getShortcuts();
		return (
			<div>
				<ModalDialog
					title="shortcutsModal.title"
					onClose={hide}
					buttons={false}
					cancelButton={false}
				>
					<div>
						{Object.keys(shortcuts).map(context => (
							<div class={style.context}>
								<h2>{context}</h2>
								<Commands commands={shortcuts[context]} />
							</div>
						))}
					</div>
				</ModalDialog>
			</div>
		);
	}
}

function Commands({ commands }) {
	return (
		<ul class={style.commandListWrapper}>
			{commands.map(([shortcut, displayName]) => (
				<li>
					<span class={style.shortcut}>{shortcut}</span>
					<span class={style.displayName}>
						<Text id={`shortcuts.${displayName}`}>{displayName}</Text>
					</span>
				</li>
			))}
		</ul>
	);
}
