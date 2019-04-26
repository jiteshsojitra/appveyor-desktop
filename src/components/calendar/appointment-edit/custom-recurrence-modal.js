import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import moment from 'moment';
import { ChoiceInput, Select, Option } from '@zimbra/blocks';
import { withProps } from 'recompose';
import ModalDialog from '../../modal-dialog';
import DateInput from '../../date-input';
import TextInput from '../../text-input';
import MonthYearDropdown from './month-year-dropdown';
import get from 'lodash-es/get';
import { CALENDAR_REPEAT_FREQUENCY, weekDaySorter } from '../../../constants/calendars';
import isEmpty from 'lodash-es/isEmpty';

import s from './style';

const REPEAT_OPTIONS = ['DAI', 'WEE', 'MON', 'YEA'];

const WEEK_ORDER = ['first', 'second', 'third', 'fourth', 'last'];

@withProps(({ event }) => {
	const startDate = moment(event.start);
	const date = startDate.date();
	return {
		startDate,
		date,
		order: Math.ceil(date / 7),
		weekDay: startDate.format('dddd'),
		month: startDate.format('MMMM')
	};
})
@withText(({ order }) => ({
	weekOrder: `calendar.dialogs.customRecurrence.repeatSection.weekOrder.${WEEK_ORDER[order - 1]}`
}))
export default class CustomRecurrenceModal extends Component {
	state = {
		endingOption: 'neverEnds',
		selectedOption: CALENDAR_REPEAT_FREQUENCY.daily,
		intervalCount: 1,
		monthYearOption: 'byDateRule'
	};

	handleEndsOnOptionChange = ({ target: { value } }) =>
		this.setState({
			endingOption: value,
			endsOnDate: null,
			endsAfterRecur: null
		});

	isEventEndCriteriaValid = () => {
		const { endingOption, endsOnDate, endsAfterRecur } = this.state;
		const {
			event: { start }
		} = this.props;
		let isEventEndValInvalid = false;

		if (endingOption === 'endsOnDate') {
			isEventEndValInvalid = moment(endsOnDate).diff(start, 'days') < 0;
		} else if (endingOption === 'endsAfterOccurence') {
			isEventEndValInvalid = isNaN(endsAfterRecur) || endsAfterRecur < 0 || endsAfterRecur > 99;
		}

		this.setState({ isEventEndValInvalid });
	};

	handleEndDateChange = date => {
		this.setState(
			{
				endsOnDate: date,
				endsAfterRecur: null
			},
			this.isEventEndCriteriaValid
		);
	};

	handleOccurenceCountChange = ({ target: { value } }) => {
		this.setState(
			{
				endsAfterRecur: parseInt(value, 10),
				endsOnDate: null
			},
			this.isEventEndCriteriaValid
		);
	};

	onAction = () => {
		const { onSave, onClose } = this.props;
		const {
			endsOnDate,
			endsAfterRecur,
			customByDayRule,
			customByMonthRule,
			customByMonthDayRule,
			customBySetPosRule,
			selectedOption,
			intervalCount
		} = this.state;

		onSave({
			...(endsOnDate && {
				endsOnDate: moment(endsOnDate).format('YYYYMMDD')
			}),
			endsAfterRecur,
			customByDayRule,
			customByMonthRule,
			customByMonthDayRule,
			customBySetPosRule,
			selectedOption,
			intervalCount
		});

		onClose();
	};

	updateValue = ({ value: selectedOption }) =>
		this.setState({ selectedOption }, this.setCustomValues);

	updateMonthYearValue = ({ value: monthYearOption }) =>
		this.setState({ monthYearOption }, this.setCustomValues);

	setCustomValues = () => {
		const { monthYearOption, selectedOption } = this.state;
		const { startDate, date, order } = this.props;
		const weekDay = startDate.format('dd').toUpperCase();
		const monthValue = startDate.month() + 1;
		switch (selectedOption) {
			case CALENDAR_REPEAT_FREQUENCY.daily:
				this.setState({
					customByMonthDayRule: null,
					customByDayRule: null,
					customByMonthRule: null,
					customBySetPosRule: null
				});
				break;
			case CALENDAR_REPEAT_FREQUENCY.weekly:
				this.setState({
					customByMonthDayRule: null,
					customByDayRule: this.getCustomByDayRule(weekDay),
					customByMonthRule: null,
					customBySetPosRule: null
				});
				break;
			case CALENDAR_REPEAT_FREQUENCY.monthly:
				if (monthYearOption === 'byDateRule') {
					this.setState({
						customByMonthDayRule: this.getCustomByMonthDayRule(date),
						customByDayRule: null,
						customByMonthRule: null,
						customBySetPosRule: null
					});
				} else {
					this.setState({
						customBySetPosRule: this.getCustomBySetPosRule(order),
						customByDayRule: this.getCustomByDayRule(weekDay),
						customByMonthRule: null,
						customByMonthDayRule: null
					});
				}
				break;
			case CALENDAR_REPEAT_FREQUENCY.yearly:
				if (monthYearOption === 'byDateRule') {
					this.setState({
						customByMonthDayRule: this.getCustomByMonthDayRule(date),
						customByMonthRule: this.getCustomByMonthRule(monthValue),
						customByDayRule: null,
						customBySetPosRule: null
					});
				} else {
					this.setState({
						customBySetPosRule: this.getCustomBySetPosRule(order),
						customByMonthRule: this.getCustomByMonthRule(monthValue),
						customByDayRule: this.getCustomByDayRule(weekDay),
						customByMonthDayRule: null
					});
				}
				break;
		}

		this.validateIntervalCount();
	};

	getCustomByDayRule = weekDay => ({
		wkday: [
			{
				day: weekDay
			}
		]
	});

	getCustomByMonthDayRule = date => ({
		dayList: date.toString()
	});

	getCustomByMonthRule = monthValue => ({
		monthList: monthValue
	});

	getCustomBySetPosRule = order => ({
		poslist: order === 5 ? -1 : order
	});

	sortSelectedWeekDays = () => {
		const { customByDayRule } = this.state;
		customByDayRule.wkday.sort((a, b) => weekDaySorter[a.day] - weekDaySorter[b.day]);
		this.setState({ customByDayRule });
	};

	handleSelectWeekDays = e => {
		const checked = get(e, 'target.checked');
		const value = get(e, 'target.value');
		const weekDayRule = this.state.customByDayRule;
		if (!checked && weekDayRule && weekDayRule.wkday.find(({ day }) => day === value)) {
			this.setState({
				customByDayRule: { wkday: weekDayRule.wkday.filter(({ day }) => day !== value) }
			});
		} else {
			this.setState(prevState => ({
				customByDayRule: {
					wkday: prevState.customByDayRule
						? [...prevState.customByDayRule.wkday, { day: value }]
						: [{ day: value }]
				}
			}));
		}
		this.sortSelectedWeekDays();
	};

	handleIntervalCountChange = ({ target: { value } }) =>
		this.setState({ intervalCount: parseInt(value, 10) }, this.validateIntervalCount);

	validateIntervalCount = () => {
		const { intervalCount, selectedOption } = this.state;
		let isIntervalCountInvalid = false;
		if (selectedOption === CALENDAR_REPEAT_FREQUENCY.yearly) {
			isIntervalCountInvalid = intervalCount !== 1;
		} else {
			isIntervalCountInvalid = isNaN(intervalCount) || intervalCount < 1 || intervalCount > 99;
		}

		this.setState({ isIntervalCountInvalid });
	};

	componentWillMount() {
		const {
			eventEndsOnDate,
			eventEndsAfterRecur,
			customEventByMonthRule,
			customEventByDayRule,
			customEventByMonthDayRule,
			customEventBySetPosRule,
			customRepeatValue,
			customEventIntervalRule
		} = this.props;
		this.setState({
			endingOption: eventEndsOnDate
				? 'endsOnDate'
				: eventEndsAfterRecur
				? 'endsAfterOccurence'
				: 'neverEnds',
			endsOnDate: eventEndsOnDate,
			endsAfterRecur: eventEndsAfterRecur,
			customByDayRule: customEventByDayRule,
			customByMonthRule: customEventByMonthRule,
			customByMonthDayRule: customEventByMonthDayRule,
			customBySetPosRule: customEventBySetPosRule,
			selectedOption:
				customRepeatValue === CALENDAR_REPEAT_FREQUENCY.none
					? CALENDAR_REPEAT_FREQUENCY.daily
					: customRepeatValue,
			intervalCount: customEventIntervalRule || 1,
			monthYearOption: !isEmpty(customEventByMonthDayRule)
				? 'byDateRule'
				: !isEmpty(customEventByDayRule)
				? 'byWeekDayRule'
				: 'byDateRule'
		});
	}

	renderSelectedOption(selectedOption) {
		const { date, weekOrder, weekDay, month } = this.props;
		const { monthYearOption } = this.state;
		const fields = {
			date,
			order: weekOrder,
			weekDay,
			month
		};
		const wkDay = get(this.state.customByDayRule, 'wkday');
		const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

		if (selectedOption === CALENDAR_REPEAT_FREQUENCY.weekly) {
			return (
				<div class={s.weekDayOption}>
					<span>
						<Text id="calendar.dialogs.customRecurrence.repeatSection.on" />
					</span>
					<ul class={s.selectWeekDays}>
						{days.map(wDay => (
							<li>
								<input
									type="checkbox"
									id={wDay}
									value={wDay}
									checked={wkDay && wkDay.find(({ day }) => day === wDay)}
									onChange={this.handleSelectWeekDays}
								/>
								<label for={wDay}>
									<Text id={`calendar.dialogs.customRecurrence.repeatSection.weekDays.${wDay}`} />
								</label>
							</li>
						))}
					</ul>
				</div>
			);
		} else if (
			selectedOption === CALENDAR_REPEAT_FREQUENCY.monthly ||
			selectedOption === CALENDAR_REPEAT_FREQUENCY.yearly
		) {
			return (
				<MonthYearDropdown
					fields={fields}
					optionType={selectedOption}
					monthYearOption={monthYearOption}
					onChange={this.updateMonthYearValue}
				/>
			);
		}
		return;
	}

	render(
		{ onClose },
		{
			endingOption,
			endsOnDate,
			endsAfterRecur,
			isEventEndValInvalid,
			selectedOption,
			intervalCount,
			isIntervalCountInvalid
		}
	) {
		return (
			<ModalDialog
				class={s.customRecurrenceModal}
				title="calendar.dialogs.customRecurrence.title"
				actionLabel="buttons.save"
				onAction={this.onAction}
				onClose={onClose}
				disablePrimary={isEventEndValInvalid || isIntervalCountInvalid}
				disableOutsideClick
			>
				<div class={s.repeatvalue}>
					<Text id="calendar.dialogs.customRecurrence.repeatSection.title" />
					<TextInput
						type="number"
						class={s.repeatInterval}
						value={intervalCount}
						onInput={this.handleIntervalCountChange}
						invalid={isIntervalCountInvalid}
					/>
					<Select
						displayValue={
							<Text
								plural={intervalCount || 1}
								id={`calendar.dialogs.customRecurrence.repeatSection.dropdown.${selectedOption}`}
							/>
						}
						iconPosition="right"
						iconSize="sm"
						showTooltip={false}
						onChange={this.updateValue}
						class={s.selectButton}
						dropdown
						toggleButtonClass={s.toggleButtonClass}
					>
						{REPEAT_OPTIONS.map(val => (
							<Option icon={null} class={s.dropdownOption} value={val} key={val}>
								<Text
									plural={intervalCount || 1}
									id={`calendar.dialogs.customRecurrence.repeatSection.dropdown.${val}`}
								/>
							</Option>
						))}
					</Select>
				</div>
				{this.renderSelectedOption(selectedOption)}
				<div class={s.header}>
					<Text id="calendar.dialogs.customRecurrence.endsSection.title" />
				</div>
				<div class={s.endingOption}>
					<label>
						<ChoiceInput
							type="radio"
							name="customRecurrence"
							value="neverEnds"
							checked={endingOption === 'neverEnds'}
							onChange={this.handleEndsOnOptionChange}
						/>
						<Text id="calendar.dialogs.customRecurrence.endsSection.labels.never" />
					</label>
				</div>
				<div class={s.endingOption}>
					<label>
						<ChoiceInput
							type="radio"
							name="customRecurrence"
							value="endsOnDate"
							checked={endingOption === 'endsOnDate'}
							onChange={this.handleEndsOnOptionChange}
						/>
						<Text id="calendar.dialogs.customRecurrence.endsSection.labels.onDate" />
					</label>
					<DateInput
						class={s.dateSelector}
						dateValue={endsOnDate}
						disabled={!(endingOption === 'endsOnDate')}
						onDateChange={this.handleEndDateChange}
						invalid={endingOption === 'endsOnDate' && isEventEndValInvalid}
					/>
				</div>
				<div class={s.endingOption}>
					<label>
						<ChoiceInput
							type="radio"
							name="customRecurrence"
							value="endsAfterOccurence"
							checked={endingOption === 'endsAfterOccurence'}
							onChange={this.handleEndsOnOptionChange}
						/>
						<Text id="calendar.dialogs.customRecurrence.endsSection.labels.afterNOccurances" />
					</label>
					<TextInput
						type="number"
						class={s.numOfOccurencesSelector}
						disabled={!(endingOption === 'endsAfterOccurence')}
						value={endsAfterRecur}
						onInput={this.handleOccurenceCountChange}
						invalid={endingOption === 'endsAfterOccurence' && isEventEndValInvalid}
					/>
					<Text id="calendar.dialogs.customRecurrence.endsSection.labels.numOfOccurences" />
				</div>
			</ModalDialog>
		);
	}
}
