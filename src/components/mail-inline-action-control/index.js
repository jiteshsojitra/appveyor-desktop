import { h, Component } from 'preact';
import cx from 'classnames';
import { Icon } from '@zimbra/blocks';

import s from './style.less';

export default class MailInlineActionControl extends Component {
	handleClick = e => this.props.onChange && this.props.onChange(e, !this.props.value);

	render({ className, activeClassName, value, onChange, ...rest }) {
		return (
			<Icon
				role="button"
				size="sm"
				class={cx(
					s.mailInlineActionControl,
					className,
					value && s.active,
					value && activeClassName
				)}
				onClick={this.handleClick}
				value={value}
				{...rest}
			/>
		);
	}
}
