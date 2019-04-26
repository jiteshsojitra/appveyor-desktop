import { h, Component } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import cx from 'classnames';
import s from './style.less';

export default class TextInput extends Component {
	focus = () => this.input.focus();

	registerRef = ref => {
		this.input = ref;
		this.props.inputRef && this.props.inputRef(ref);
	};

	handleBlur = e => {
		const { value, onAutoComplete, onBlur } = this.props;
		if (e.target.value !== value) {
			// Workaround iOS autocomplete not firing `input` events. Instead the value
			// of the input will be set and the input will be blurred immediately.
			onAutoComplete && onAutoComplete(e);
		}
		onBlur && onBlur(e);
	};
	componentDidMount() {
		if (this.props.autofocus) {
			this.input.focus();
		}
	}

	render({ wide, invalid, placeholder, placeholderId, ...rest }) {
		return (
			<Localizer>
				<input
					type="text"
					{...rest}
					onBlur={this.handleBlur}
					placeholder={placeholderId ? <Text id={placeholderId} /> : placeholder}
					class={cx(s.input, wide && s.wide, invalid && s.invalid, rest.class)}
					ref={this.registerRef}
				/>
			</Localizer>
		);
	}
}
