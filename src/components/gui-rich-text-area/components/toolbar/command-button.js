import { h, Component } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import ToolbarButton from './toolbar-button';

export class CommandButton extends Component {
	handleClick = e => {
		if (typeof e.button !== 'undefined' && e.button !== 0) {
			return;
		}

		const { command, commandType: type, execCommand, onClick } = this.props;
		if (command && execCommand) {
			execCommand({ command, type });
		} else if (onClick) {
			onClick(e);
		}
		return this.cancel(e);
	};

	cancel(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	}

	render({ label, command, commandState = {}, icon, style, title, ...props }) {
		return (
			<Localizer>
				<ToolbarButton
					{...props}
					title={<Text id={`compose.toolbar.${title || command}`} />}
					active={commandState[command]}
					onClick={this.handleClick}
					icon={icon}
				>
					{label}
				</ToolbarButton>
			</Localizer>
		);
	}
}
