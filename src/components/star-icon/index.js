import { h, Component } from 'preact';
import { Localizer, Text } from 'preact-i18n';
import PropTypes from 'prop-types';
import cx from 'classnames';

import { Icon } from '@zimbra/blocks';

import s from './style.less';

export default class StarIcon extends Component {
	handleClick = e => {
		e.stopPropagation();
		return this.props.onClick && this.props.onClick(e, !this.props.value);
	};

	static propTypes = {
		class: PropTypes.string
	};

	render({ class: cls, icon, starred, size, onClick, localFolder, ...rest }) {
		return (
			<Localizer>
				<Icon
					{...rest}
					onClick={!localFolder && this.handleClick}
					size={size || 'sm'}
					aria-checked={starred ? 'true' : 'false'}
					aria-label={<Text id="buttons.starred" />}
					class={cx(
						!localFolder && s.star,
						localFolder && s.starDisabled,
						starred && s.starred,
						cls
					)}
					name="star"
					role="checkbox"
				/>
			</Localizer>
		);
	}
}
