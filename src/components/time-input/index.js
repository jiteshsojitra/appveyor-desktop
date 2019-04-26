import { h, Component } from 'preact';
import cx from 'classnames';
import moment from 'moment';
import TextInput from '../text-input';
import s from './style.less';

const FORMAT = 'HH:mm';

function isValid(value) {
	return moment(value, FORMAT).isValid();
}

class TimeInput extends Component {
	handleInput = e => {
		const { onDateChange, onInput } = this.props;
		if (!isValid(e.target.value)) {
			return;
		}

		if (onDateChange) {
			const [hour, minute] = e.target.value.split(':');
			const nextDateValue = this.dateValue.clone().set({
				hour,
				minute
			});
			onDateChange(nextDateValue.toDate());
		}

		onInput && onInput(e);
	};

	render(props) {
		this.dateValue = props.dateValue && moment(props.dateValue);

		return (
			<TextInput
				type="time"
				value={this.dateValue && this.dateValue.format('HH:mm')}
				{...props}
				onInput={this.handleInput}
				class={cx(s.input, props.class)}
			/>
		);
	}
}

export default TimeInput;
