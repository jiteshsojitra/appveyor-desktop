import { h } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';
import settingsStyle from '../settings/style';
import PureComponent from '../../lib/pure-component';
import TimeSlots from '../../constants/time-slots';
import style from './style.less';

class TimePicker extends PureComponent {
	state = {
		selectedTime: this.props.displayedTime,
		dropDown: false
	};

	openDropdown = () => this.setState({ dropDown: true });
	closeDropdown = () => this.setState({ dropDown: false });

	selectTime = timeSlot => this.props.onUpdateTime(timeSlot);

	/**
	 * Set the refs
	 */
	setWrapperRef = node => (this.wrapperRef = node);
	setSelectRef = node => (this.selectRef = node);

	/**
	 * Close Dropdown if outside click detected.
	 */
	handleClickOutside = event => {
		if (
			this.wrapperRef &&
			!this.wrapperRef.contains(event.target) &&
			!this.selectRef.contains(event.target)
		) {
			this.closeDropdown();
		}
	};

	componentDidMount() {
		document.addEventListener('mousedown', this.handleClickOutside);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.displayedTime !== this.state.selectedTime) {
			this.setState({ selectedTime: nextProps.displayedTime });
		}
	}

	componentWillUnmount() {
		document.removeEventListener('mousedown', this.handleClickOutside);
	}

	/* eslint-disable react/jsx-no-bind */

	render() {
		const { selectedTime, dropDown } = this.state;
		return (
			<div
				ref={this.setSelectRef}
				onClick={!dropDown ? this.openDropdown : this.closeDropdown}
				class={cx(
					settingsStyle.select,
					settingsStyle.half,
					style.fakeSelect,
					this.props.class,
					this.props.invalid && style.invalid
				)}
			>
				<span>{selectedTime}</span>
				{dropDown && (
					<ul class={style.dropdown} ref={this.setWrapperRef}>
						{TimeSlots.map((slot, slotIndex, slotsArray) => {
							if (slotIndex % 4 === 0) {
								return (
									<li class={style.dropdownItem}>
										<span
											onClick={() => {
												this.selectTime(slot);
											}}
										>
											{slot}
										</span>
										<ul class={style.secondLevelDD}>
											{[1, 2, 3].map(number => (
												<li
													onClick={() => {
														this.selectTime(slotsArray[slotIndex + number]);
													}}
												>
													{slotsArray[slotIndex + number]}
												</li>
											))}
										</ul>
									</li>
								);
							}
						})}
					</ul>
				)}
			</div>
		);
	}
}

/* eslint-enable react/jsx-no-bind */

TimePicker.propTypes = {
	displayedTime: PropTypes.string.isRequired,
	onUpdateTime: PropTypes.func.isRequired
};

export default TimePicker;
