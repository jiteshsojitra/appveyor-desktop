import { h, Component } from 'preact';
import { Localizer, Text } from 'preact-i18n';
import cx from 'classnames';
import s from './style.less';

function stopPropagation(e) {
	e.stopPropagation();
}
export default class UnreadControl extends Component {
	handleClick = e => {
		e.stopPropagation();
		return this.props.onChange && this.props.onChange(e, !this.props.value);
	};

	render({ class: cls, value, visible, onChange, localFolder, ...rest }) {
		return (
			<Localizer>
				<div
					role="checkbox"
					aria-checked={value ? 'true' : 'false'}
					aria-label={<Text id="buttons.unread" />}
					class={cx(
						!localFolder && s.unreadControl,
						localFolder && s.unreadControlDisabled,
						value && s.unread,
						visible && s.visible,
						cls
					)}
					onClick={localFolder ? stopPropagation : this.handleClick}
					value={value}
					{...rest}
				/>
			</Localizer>
		);
	}
}
