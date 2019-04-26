import { h, Component } from 'preact';
import cx from 'classnames';
import moment from 'moment';
import { Text } from 'preact-i18n';

import { KeyCodes, Popover } from '@zimbra/blocks';

import { featureDetectDateInput, featureDetectTouch } from '../../utils/feature-detection';
import { matchesFormats } from '../../utils/date-input';
import MiniCal from '../calendar/mini-cal';
import TextInput from '../text-input';
import linkref from 'linkref';
import { withPropsOnChange } from 'recompose';
import focusableSelector from 'focusable';

import s from './style.less';

@withPropsOnChange(['dateValue'], ({ dateValue }) => ({
	momentDateValue: dateValue && moment(dateValue)
}))
export default class DateInput extends Component {
	static native = featureDetectTouch() && featureDetectDateInput();

	handleChangeMiniCal = nextDate => {
		const { onDateChange, momentDateValue: prevDateValue } = this.props;
		let nextDateValue = moment(nextDate);

		if (prevDateValue) {
			const year = nextDateValue.year();
			const month = nextDateValue.month();
			const date = nextDateValue.date();

			nextDateValue = prevDateValue.clone().set({
				year,
				month,
				date
			});
		}

		onDateChange && onDateChange(nextDateValue.toDate());
		this.closePopover();
		this.refs.input && this.refs.input.focus();
		this.setState({ value: undefined, invalid: false });
	};

	handleKeyDownMiniCal = e => {
		if (e.keyCode === KeyCodes.ESCAPE || (e.altKey && e.keyCode === KeyCodes.UP_ARROW)) {
			e.preventDefault();
			this.closePopover();
			this.refs.input && this.refs.input.focus();
		} else if (e.keyCode === KeyCodes.TAB) {
			// Lock focus like a modal dialog, the user must press escape or choose a date to exit.
			const focusables = this.refs.popover.querySelectorAll(
				focusableSelector.replace('button', 'button:not([tabindex="-1"])')
			);
			if (e.shiftKey) {
				if (e.target === focusables[0]) {
					e.preventDefault();
					focusables[focusables.length - 1].focus();
				}
			} else if (e.target === focusables[focusables.length - 1]) {
				e.preventDefault();
				focusables[0].focus();
			}
		}
	};

	// Returns a list of formats where 0 padding is optional.
	getFormats = () => [
		this.props.format,
		this.props.format.replace('MM', 'M'),
		this.props.format.replace('DD', 'D'),
		this.props.format.replace('MM', 'M').replace('DD', 'D')
	];

	momentFromStr = value => moment(value, this.getFormats(), true);

	shouldParseInput = value =>
		typeof value !== 'undefined' && matchesFormats(value, this.getFormats());

	restoreRange = () => {
		if (this.range && this.range.length) {
			this.refs.input.setSelectionRange(...this.range);
			this.range = [];
		}
	};

	saveRange = () => {
		if (this.refs.input) {
			this.range = [this.refs.input.selectionStart, this.refs.input.selectionEnd];
		}
	};

	handleInputTextInput = ({ target: { value } }) => {
		const { onDateChange, handleInvalidDate } = this.props;
		const m = this.momentFromStr(value);
		if (this.shouldParseInput(value)) {
			if (m.isValid()) {
				onDateChange(m.toDate());
				this.saveRange();
				this.setState({ value: undefined, invalid: false });
				// Restore the users range after a re-render.
				setTimeout(this.restoreRange);
				return;
			}
		}
		// Skip live validation on date field when it is supposed to be handled on blur.
		this.setState({
			value,
			invalid: handleInvalidDate ? false : !(value === ''),
			minicalActive: false
		});
	};

	handleBlurTextInput = e => {
		if (this.refs.popover) {
			if (e.relatedTarget && !this.refs.popover.contains(e.relatedTarget)) {
				// If a blur event is going to focus a new element and the popover is
				// open, close the Popover
				this.closePopover();
			}
		} else {
			// If blurring away and a user entered date is invalid, set `invalid`
			const { value } = this.state;
			const { handleInvalidDate } = this.props;
			const isDateInvalid =
				typeof value !== 'undefined' && value !== '' && !this.momentFromStr(value).isValid();
			isDateInvalid && this.setState({ invalid: isDateInvalid });
			handleInvalidDate && handleInvalidDate(isDateInvalid, value);
		}
	};

	handleNativeInput = e => {
		this.props.onDateChange && this.props.onDateChange(moment(e.target.value).toDate());
	};

	handleKeyDownTextInput = e => {
		const { keyCode, key } = e;

		if ((e.altKey && keyCode === KeyCodes.UP_ARROW) || keyCode === KeyCodes.ESCAPE) {
			this.closePopover();
		} else if (
			(e.altKey && keyCode === KeyCodes.DOWN_ARROW) ||
			keyCode === KeyCodes.CARRIAGE_RETURN ||
			keyCode === KeyCodes.SPACE_BAR
		) {
			e.preventDefault();
			this.handlePopoverToggle(!this.state.minicalActive);
		} else if (this.state.minicalActive && !e.shiftKey && keyCode === KeyCodes.TAB) {
			e.preventDefault();
			this.refs.minical && this.refs.minical.focus();
		} else if (key.length === 1 && !e.ctrlKey && !e.altKey && /[^/0-9]/g.test(key)) {
			// Prevent typing anything other than the whitelisted characters: / and 0-9
			// Permits CTRL/ALT hotkey combinations, like CTRL+A
			e.preventDefault();
		}
	};

	closePopover = () => {
		this.setState({ minicalActive: false });
	};
	openPopover = () => {
		this.setState({ minicalActive: true });
	};
	handlePopoverToggle = minicalActive => {
		this.setState({ minicalActive });
	};

	clearAndClose = () => {
		this.closePopover();
		this.props.onClear && this.props.onClear();
	};

	static defaultProps = {
		format: 'MM/DD/YYYY'
	};

	render(
		{
			disabled,
			momentDateValue,
			dateValue,
			enableClear,
			onClear,
			onDateChange,
			format,
			name,
			handleInvalidDate,
			...props
		},
		{ minicalActive, value, invalid }
	) {
		if (DateInput.native) {
			return (
				<input
					disabled={disabled}
					value={momentDateValue && momentDateValue.format('YYYY-MM-DD')}
					type="date"
					onInput={this.handleNativeInput}
				/>
			);
		}

		// Skip live validation on date field when it is supposed to be handled on blur.
		const isParseable = !handleInvalidDate && this.shouldParseInput(value);
		const isInputValid = isParseable && this.momentFromStr(value).isValid();

		return (
			<div class={props.class}>
				<Popover
					active={minicalActive}
					onToggle={this.handlePopoverToggle}
					classes={{
						popoverClass: s.popover
					}}
					placement="bottom"
					anchor="center"
					disabled={disabled}
					target={
						<TextInput
							value={
								typeof value !== 'undefined' && !isInputValid
									? value
									: momentDateValue && momentDateValue.format(format)
							}
							{...props}
							disabled={disabled}
							invalid={props.invalid || invalid || (isParseable && !isInputValid)}
							onInput={this.handleInputTextInput}
							onBlur={this.handleBlurTextInput}
							onKeyDown={this.handleKeyDownTextInput}
							inputRef={linkref(this, 'input')}
							name={name}
							class={cx(s.input, props.class)}
							placeholder={format.toLowerCase()}
						/>
					}
				>
					<div ref={linkref(this, 'popover')} class={s.popover}>
						<MiniCal
							ref={linkref(this, 'minical')}
							onKeyDown={this.handleKeyDownMiniCal}
							date={dateValue}
							onNavigate={this.handleChangeMiniCal}
						/>
						{enableClear && dateValue && (
							<div class={s.clearButtonContainer}>
								<button class={s.clearButton} onClick={this.clearAndClose}>
									<Text id="buttons.clear" />
								</button>
							</div>
						)}
					</div>
				</Popover>
			</div>
		);
	}
}
