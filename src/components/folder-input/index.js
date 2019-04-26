import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';

import { Icon, KeyCodes } from '@zimbra/blocks';
import { Text, Localizer } from 'preact-i18n';
import NakedButton from '../naked-button';

import s from './style.less';

export default class FolderInput extends Component {
	handleKeyup = e => {
		if (e.keyCode === KeyCodes.CARRIAGE_RETURN) {
			this.props.onSubmit(e.target.value);
		} else if (e.keyCode === KeyCodes.ESCAPE) {
			this.props.onClose && this.props.onClose();
		}
	};

	handleBlur = e => {
		const { closeOnBlur, onClose, onBlur } = this.props;

		if (closeOnBlur) {
			onClose();
		}

		if (onBlur) {
			onBlur(e);
		}
	};

	static propTypes = {
		onClose: PropTypes.func,
		onSubmit: PropTypes.func.isRequired,
		onInput: PropTypes.func.isRequired,
		value: PropTypes.string.isRequired,
		closeOnBlur: PropTypes.bool,
		selectAllOnFocus: PropTypes.bool
	};

	static defaultProps = {
		closeOnBlur: true,
		selectAllOnFocus: false,
		onSubmit: () => {},
		placeholderTextId: ''
	};

	componentDidMount() {
		this.input.focus();

		if (this.props.selectAllOnFocus) {
			this.input.setSelectionRange(this.input.value.length, this.input.value.length);
		}
	}

	render({ onClose, onInput, value, placeholderTextId, icon, ...rest }) {
		return (
			<div {...rest} class={cx(s.folderInputContainer, rest.class)}>
				{icon && <Icon name={icon} class={s.folderInputIcon} size="sm" />}
				<Localizer>
					<input
						type="text"
						class={cx(s.folderInput, icon && s.folderInputWithIcon)}
						value={value}
						onInput={onInput}
						onKeyup={this.handleKeyup}
						onBlur={this.handleBlur}
						placeholder={<Text id={placeholderTextId} />}
						ref={ref => (this.input = ref)}
					/>
				</Localizer>
				{onClose && (
					<NakedButton class={s.folderInputClose} onClick={onClose}>
						<Icon name="close" size="sm" />
					</NakedButton>
				)}
			</div>
		);
	}
}
