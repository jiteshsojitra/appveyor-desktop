import { h } from 'preact';
import { Text, withText } from 'preact-i18n';
import moment from 'moment-timezone';
import cx from 'classnames';
import ErrorTooltip from '../../error-tooltip';
import TimePicker from '../../time-picker';
import HelpTooltip from '../../help-tooltip';
import PureComponent from '../../../lib/pure-component';
import cloneDeep from 'lodash-es/cloneDeep';
import mapValues from 'lodash-es/mapValues';
import style from '../style';
import TimeZones from '../../../constants/time-zones';
import withMediaQuery from '../../../enhancers/with-media-query';
import { maxWidth, screenXsMax } from '../../../constants/breakpoints';
import { filterNonInsertableCalendars } from '../../../utils/calendar';
import { Select, Option, ChoiceInput } from '@zimbra/blocks';
import CalendarOptionItem from '../../calendar/appointment-edit/calendar-option-item';
import { withCalendars } from '../../../graphql-decorators/calendar';
import SelectOption from '../../select';

@withCalendars()
@withMediaQuery(maxWidth(screenXsMax), 'matchesScreenXsMax')
@withText({
	generalSettingsTitle: 'settings.calendarAndReminders.generalSettingsTitle',
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatLongHourLT: `${timeFormats}.longDateFormat.longHourLT`,
		formatLT: `${timeFormats}.longDateFormat.LT`,
		format24HourMinute: 'timeFormats.format24hr.formatHourMinute'
	};
})
export default class CalendarAndRemindersSettings extends PureComponent {
	state = {
		timeOfDay: cloneDeep(this.props.value.timeOfDay),
		timeError: { visible: false, message: '' },
		tooltipsVisibility: {
			timezone: false,
			defaultCal: false
		}
	};

	dismiss = e => {
		e.stopPropagation();
		this.setState({
			tooltipsVisibility: mapValues(this.state.tooltipsVisibility, () => false)
		});
	};

	toggleTooltip = id =>
		this.setState({
			tooltipsVisibility: mapValues(this.state.tooltipsVisibility, (val, key) => key === id)
		});

	updateStartTime = timeSlot => {
		const { formatLongHourLT, formatLT } = this.props;
		const { timeOfDay } = this.state;
		if (
			moment(timeSlot, formatLongHourLT) >=
			moment(moment(timeOfDay[1].end).format(formatLT), formatLongHourLT)
		) {
			this.setState({
				timeError: {
					visible: true,
					message: 'Start of day cannot be after the end of day.'
				}
			});
			return;
		}
		const timeOfDayCopy = mapValues(timeOfDay, day => ({
			...day,
			start: timeSlot
		}));
		this.setState({ timeOfDay: timeOfDayCopy, timeError: { visible: false, message: '' } }, () => {
			this.props.onFieldChange('timeOfDay')({
				target: { value: timeOfDay }
			});
		});
	};

	updateAppleIcalDelegationEnabled = () => {
		const toggledValue = !this.props.value.enableAppleIcalDelegation;
		this.props.onFieldChange('enableAppleIcalDelegation')({
			target: { value: toggledValue }
		});
	};
	updateEndTime = timeSlot => {
		const { formatLT, formatLongHourLT } = this.props;
		const { timeOfDay } = this.state;
		if (
			moment(timeSlot, formatLongHourLT) <=
			moment(moment(timeOfDay[1].start).format(formatLT), formatLongHourLT)
		) {
			this.setState({
				timeError: {
					visible: true,
					message: 'End of day cannot be before the start of day.'
				}
			});
			return;
		}

		const timeOfDayCopy = mapValues(timeOfDay, day => ({
			...day,
			end: timeSlot
		}));
		this.setState({ timeOfDay: timeOfDayCopy, timeError: { visible: false, message: '' } }, () => {
			this.props.onFieldChange('timeOfDay')({
				target: { value: timeOfDay }
			});
		});
	};

	selectCalendar = (id, calendars) => calendars.find(cal => cal.id === id);

	onCalendarChangeHandler = e => {
		const insertableCals = filterNonInsertableCalendars(this.props.calendars);

		this.setState({
			selectedCal: this.selectCalendar(e.value.id, insertableCals)
		});

		this.props.onFieldChange('defaultCalendar')({
			target: {
				value: e.value.id
			}
		});
	};

	render(
		{ generalSettingsTitle, onFieldChange, value, matchesScreenXsMax, calendars, formatLT },
		{ selectedCal }
	) {
		const { timeError, timeOfDay, tooltipsVisibility } = this.state;
		const startTime = moment(timeOfDay[1].start).format(formatLT);
		const endTime = moment(timeOfDay[1].end).format(formatLT);
		const insertableCals = filterNonInsertableCalendars(calendars);
		const defaultCalendar = value.defaultCalendar && value.defaultCalendar.toString();
		const defaultExists = insertableCals.find(({ id }) => id === defaultCalendar);

		return (
			<div>
				<div>
					<div class={style.sectionTitle}>{generalSettingsTitle}</div>
					{timeError.visible && <ErrorTooltip message={timeError.message} />}
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle, style.forSelect)}>
							<Text id="settings.calendarAndReminders.defaultCalendarSubsection" />
						</div>
						<div class={style.subsectionBody}>
							<Select
								displayValue={
									insertableCals.length < 1 ? (
										'...'
									) : (
										<CalendarOptionItem
											calendar={
												selectedCal ||
												this.selectCalendar(
													(defaultExists && defaultCalendar) || insertableCals[0].id,
													insertableCals
												)
											}
											style={style}
										/>
									)
								}
								iconPosition="right"
								iconSize="sm"
								onChange={this.onCalendarChangeHandler}
								class={style.calendarSelect}
								toggleButtonClass={style.toggleButtonClass}
								disabled={insertableCals.length < 2}
							>
								{insertableCals.map(cal => (
									<Option icon={null} value={cal} key={cal.id} class={style.calendarOption}>
										<CalendarOptionItem calendar={cal} style={style} />
									</Option>
								))}
							</Select>
							<HelpTooltip
								dismiss={this.dismiss}
								name="defaultCal"
								toggleTooltip={this.toggleTooltip}
								visible={tooltipsVisibility.defaultCal}
								position={matchesScreenXsMax ? 'right' : 'left'}
								customStyle={style.defaultCalTooltip}
							>
								<p class={style.helpTooltipTitle}>
									<Text id="settings.calendarAndReminders.defaultCalendarSubsection" />
								</p>
								<p>
									<Text id="settings.calendarAndReminders.defaultCalHelpTip" />
								</p>
							</HelpTooltip>
						</div>
					</div>
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle, style.forSelect)}>
							<Text id="settings.calendarAndReminders.startOfWeekSubsection" />
						</div>
						<div class={style.subsectionBody}>
							<div class={style.half}>
								<SelectOption
									value={value.startOfWeek}
									onChange={onFieldChange('startOfWeek')}
									fullWidth
								>
									{moment.weekdays().map(day => (
										<option value={day}>{day}</option>
									))}
								</SelectOption>
							</div>
						</div>
					</div>
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle, style.forSelect)}>
							<Text id="settings.calendarAndReminders.startOfDaySubsection" />
						</div>
						<div class={style.subsectionBody}>
							<TimePicker displayedTime={startTime} onUpdateTime={this.updateStartTime} />
						</div>
					</div>
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle, style.forSelect)}>
							<Text id="settings.calendarAndReminders.endOfDaySubsection" />
						</div>
						<div class={style.subsectionBody}>
							<TimePicker displayedTime={endTime} onUpdateTime={this.updateEndTime} />
						</div>
					</div>
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle, style.forSelect)}>
							<Text id="settings.calendarAndReminders.timeZoneSubsection" />
						</div>
						<div class={cx(style.subsectionBody, style.flexContainer)}>
							<SelectOption value={value.timeZone} onChange={onFieldChange('timeZone')}>
								{TimeZones.map(TimeZone => (
									<option value={TimeZone}>{TimeZone}</option>
								))}
							</SelectOption>
							<HelpTooltip
								dismiss={this.dismiss}
								name="timezone"
								toggleTooltip={this.toggleTooltip}
								visible={tooltipsVisibility.timezone}
							>
								<p>
									<Text id="settings.calendarAndReminders.timezoneHelpTip" />
								</p>
							</HelpTooltip>
						</div>
					</div>
					<div class={cx(style.subsection, style.notYetImplemented)}>
						<div class={style.subsectionTitle}>
							<Text id="settings.calendarAndReminders.eventsListsSubsection" />
						</div>
						<div class={style.subsectionBody}>
							<ul class={style.list}>
								<li>
									<label>
										<ChoiceInput
											onChange={onFieldChange('autoAddAppointmentsToCalendar')}
											checked={value.autoAddAppointmentsToCalendar}
										/>
										<Text id="settings.calendarAndReminders.autoAddAppointmentsToCalendar" />
									</label>
								</li>
							</ul>
						</div>
					</div>
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle)}>
							<Text id="settings.calendarAndReminders.sharingTitle" />
						</div>
						<div class={style.subsectionBody}>
							<ul class={style.list}>
								<li>
									<label>
										<ChoiceInput
											onChange={this.updateAppleIcalDelegationEnabled}
											checked={value.enableAppleIcalDelegation}
										/>
										<Text id="settings.calendarAndReminders.enableAppleIcalDelegation" />
									</label>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
