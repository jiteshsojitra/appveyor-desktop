import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { Popover, Icon } from '@zimbra/blocks';
import cx from 'classnames';
import style from './style';

export default class HelpButton extends Component {
	close = () => {
		this.setState({ active: false }, () => {
			this.setState({ active: null });
		});
	};

	static defaultProps = {
		anchor: 'center',
		icon: 'question-circle'
	};

	render({ icon, anchor, title, more, children, class: c }, { active }) {
		return (
			<Popover
				active={active}
				anchor={anchor}
				icon={icon}
				toggleClass={cx(style.helpButton, c)}
				popoverClass={style.helpPopover}
			>
				<button class={style.close} onClick={this.close}>
					<Icon name="close" />
				</button>

				{title && <h6>{title}</h6>}

				{children}

				{more && (
					<p>
						<a href={typeof more === 'string' ? more : '/help'}>
							<Text id="settings.zimlets.moreHelp" />
						</a>
					</p>
				)}
			</Popover>
		);
	}
}
