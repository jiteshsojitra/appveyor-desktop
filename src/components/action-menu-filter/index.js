import { h, Component } from 'preact';
import cx from 'classnames';

import { Icon } from '@zimbra/blocks';
import NakedButton from '../naked-button';

import s from './style.less';

export default class ActionMenuFilter extends Component {
	handleClick(e) {
		e.stopPropagation();
	}

	handleClear = e => {
		e.stopPropagation();
		this.input.focus();
		this.props.onClear();
	};

	static defaultProps = {
		onClear: () => {}
	};

	componentDidMount() {
		this.input.focus();
	}

	render({ onBack, ...rest }) {
		return (
			<div class={cx(s.actionMenuFilter, onBack && s.withBack)}>
				{onBack && (
					<NakedButton onClick={onBack} class={s.backButton}>
						<Icon name="angle-left" />
					</NakedButton>
				)}
				<Icon name="search" class={s.icon} />
				<input
					{...rest}
					type="text"
					ref={ref => (this.input = ref)}
					class={cx(s.input, rest.class, rest.className)}
					onClick={this.handleClick}
				/>
				{rest.value && rest.value !== '' && (
					<NakedButton onClick={this.handleClear} class={s.clear}>
						<Icon name="close" size="sm" />
					</NakedButton>
				)}
			</div>
		);
	}
}
