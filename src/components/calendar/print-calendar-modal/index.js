import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import linkstate from 'linkstate';
import moment from 'moment-timezone';
import { Button, ChoiceInput } from '@zimbra/blocks';
import { absoluteUrl, convertTo24Format } from '../../../lib/util';
import ModalDialog from '../../modal-dialog';
import SelectOption from '../../select';
import FormGroup from '../../form-group';
import DateInput from '../../date-input';
import TimePicker from '../../time-picker';
import AlignedForm from '../../aligned-form';
import AlignedLabel from '../../aligned-form/label';
import {
	DATE_FORMAT,
	CALENDAR_PRINT_VIEWS,
	VIEW_WEEK,
	VIEW_YEAR,
	VIEW_DAY,
	VIEW_MONTH
} from '../constants';
import CalendarList from '../calendar-list';
import { hasFlag } from '../../../utils/folders';
import { configure } from '../../../config';
import queryString from 'query-string';
import withMediaQuery from '../../../enhancers/with-media-query/index';
import { minWidth, screenMd } from '../../../constants/breakpoints';

import cx from 'classnames';
import style from './style';

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@configure('routes.slugs')
@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatLongHourLT: `${timeFormats}.longDateFormat.longHourLT`,
		formatcustomDateLong: 'timeFormats.dateFormats.formatcustomDateLong'
	};
})
export default class PrintCalendarModal extends Component {
	state = {
		selectedDate: { enabled: false, date: new Date() },
		dateRange: { enabled: true, from: new Date(), to: new Date() },
		dateType: 'dateRange',
		printView: 'month',
		hoursRange: { from: '08:00 AM', to: '09:00 PM' },
		printWorkDaysOnly: true,
		printOneCalendarPerPage: true,
		includeMiniCalendar: false,
		calendarDetails: {},
		invalidDate: false,
		disableTodayButton: false
	};

	printCalendar = () => {
		const {
			selectedDate,
			dateRange,
			hoursRange,
			dateType,
			printView,
			includeMiniCalendar,
			printOneCalendarPerPage,
			printWorkDaysOnly,
			calendarDetails
		} = this.state;
		const routeQuery = {
			start:
				dateType === 'selectedDate'
					? moment(selectedDate.date.toDateString() + ' ' + hoursRange.from).valueOf()
					: moment(dateRange.from.toDateString() + ' ' + hoursRange.from).valueOf(),
			end:
				dateType === 'selectedDate'
					? moment(selectedDate.date.toDateString() + ' ' + hoursRange.to).valueOf()
					: moment(dateRange.to.toDateString() + ' ' + hoursRange.to).valueOf(),
			printView,
			calendars: calendarDetails.join(',')
		};

		if (includeMiniCalendar) {
			routeQuery.includeMiniCalendar = includeMiniCalendar;
		}

		if (printOneCalendarPerPage) {
			routeQuery.printOneCalendarPerPage = printOneCalendarPerPage;
		}

		if (printWorkDaysOnly && printView === VIEW_WEEK) {
			routeQuery.printView = 'work_week';
		}

		if (printView === VIEW_WEEK || printView === VIEW_DAY) {
			routeQuery.hoursFrom = hoursRange.from;
			routeQuery.hoursTo = hoursRange.to;
		}

		window.open(
			absoluteUrl(
				`/${this.props.slugs.printPreview}?${queryString.stringify({
					...routeQuery
				})}`
			)
		);

		if (this.props.onClose) {
			this.props.onClose();
		}
	};

	setSelectedDateToday = () => {
		this.setState({
			selectedDate: {
				enabled: true,
				date: new Date()
			}
		});
		this.setDateTypeValue('selectedDate');
	};

	toggle = ev => {
		const {
			target: { value }
		} = ev;
		this.setDateTypeValue(value);
		this.setState({
			disableTodayButton: value !== 'selectedDate'
		});
	};

	setDateTypeValue(value) {
		this.setState({
			dateType: value,
			dateRange: {
				enabled: value === 'dateRange',
				from: this.state.dateRange.from,
				to: this.state.dateRange.to
			},
			selectedDate: { enabled: value === 'selectedDate', date: this.state.selectedDate.date }
		});
	}

	checkCalendar = id => {
		const { calendarDetails } = this.state;
		const index = calendarDetails.indexOf(id);
		if (index >= 0) {
			calendarDetails.splice(index, 1);
		} else {
			calendarDetails.push(id);
		}

		this.setState({ calendarDetails });
	};

	openModal = (modalType, modalProps) => {
		this.props.toggleModal({
			modalType,
			modalProps
		});
	};

	handleInvalidDate = result => {
		this.setState({ invalidDate: result });
	};

	componentWillMount = () => {
		const {
			formatLongHourLT,
			businessHoursStart,
			businessHoursEnd,
			view,
			calendarsData,
			currentDate
		} = this.props;
		if (businessHoursStart && businessHoursEnd) {
			const dateFrom = new Date();
			dateFrom.setHours(businessHoursStart);
			dateFrom.setMinutes(0);

			const dateTo = new Date();
			dateTo.setHours(businessHoursEnd);
			dateTo.setMinutes(0);

			this.setState({
				hoursRange: {
					from: moment(dateFrom)
						.format(formatLongHourLT)
						.toUpperCase(),
					to: moment(dateTo)
						.format(formatLongHourLT)
						.toUpperCase()
				}
			});
		}

		if (view) {
			const viewState = {};
			switch (view) {
				case VIEW_DAY:
					viewState.selectedDate = { enabled: true, date: new Date(currentDate) };
					viewState.dateRange = { enabled: false, from: new Date(), to: new Date() };
					viewState.dateType = 'selectedDate';
					viewState.disableTodayButton = false;
					break;
				default:
					viewState.selectedDate = { enabled: false, date: new Date(currentDate) };
					viewState.dateRange = { enabled: true, from: new Date(), to: new Date() };
					viewState.dateType = 'dateRange';
					viewState.disableTodayButton = true;
					break;
			}

			if (view !== VIEW_YEAR) {
				viewState.printView = view;
			}

			this.setState(viewState);
		}

		if (currentDate) {
			this.setState({
				selectedDate: { enabled: this.state.selectedDate.enabled, date: new Date(currentDate) }
			});
		}

		const calendarDetails =
			calendarsData && calendarsData.calendars
				? calendarsData.calendars
						.filter(calendar => hasFlag(calendar, 'checked'))
						.map(calendar => calendar.id)
				: [];

		if (this.state.calendarDetails !== calendarDetails) {
			this.setState({ calendarDetails });
		}
	};

	render(
		{ onClose, matchesScreenMd, calendarsData, formatcustomDateLong },
		{
			selectedDate,
			dateRange,
			dateType,
			printView,
			hoursRange,
			printWorkDaysOnly,
			printOneCalendarPerPage,
			includeMiniCalendar,
			invalidDate,
			disableTodayButton
		}
	) {
		if (dateType === 'dateRange') {
			invalidDate = dateRange.from > dateRange.to;
		}
		const date = moment().format(formatcustomDateLong) + ' ';
		const startTime = moment(date + convertTo24Format(hoursRange.from));
		const endTime = moment(date + convertTo24Format(hoursRange.to));
		const invalidHourRange = startTime.isAfter(endTime);

		return (
			<ModalDialog
				class={style.printCalendarDialog}
				title="calendar.dialogs.printCalendar.DIALOG_TITLE"
				buttons={[
					<Button
						styleType="primary"
						brand="primary"
						onClick={this.printCalendar}
						disabled={invalidHourRange || invalidDate}
					>
						<Text id="buttons.print" />
					</Button>
				]}
				cancelLabel="buttons.cancel"
				onClose={onClose}
				disableOutsideClick
			>
				<div className={style.dialogContent}>
					<div className={style.calendarListContainer}>
						<CalendarList
							handleCustomCheckCalendar={this.checkCalendar}
							matchesScreenMd={matchesScreenMd}
							showGroupActions={false}
							calendarsAndAppointmentsData={calendarsData}
						/>
					</div>

					<AlignedForm className={style.optionContainer}>
						<FormGroup>
							<ChoiceInput
								type="radio"
								name="dateType"
								value="selectedDate"
								checked={dateType === 'selectedDate'}
								onChange={this.toggle}
							/>
							<AlignedLabel align={'left'}>
								<Text id="calendar.dialogs.printCalendar.SELECTED_DATE_LABEL" />
							</AlignedLabel>
							<DateInput
								class={style.inputDefaultWidth}
								disabled={!selectedDate.enabled}
								dateValue={moment(selectedDate.date, DATE_FORMAT)}
								onDateChange={linkstate(this, 'selectedDate.date')}
								handleInvalidDate={this.handleInvalidDate}
							/>
							<span class={style.spanSeparator} />
							<Button
								class={style.inputDefaultWidth}
								type="button"
								onClick={this.setSelectedDateToday}
								disabled={disableTodayButton}
							>
								<Text id="calendar.dialogs.printCalendar.TODAY_LABEL" />
							</Button>
						</FormGroup>
						<FormGroup>
							<ChoiceInput
								type="radio"
								name="dateType"
								value="dateRange"
								checked={dateType === 'dateRange'}
								onChange={this.toggle}
							/>
							<AlignedLabel align={'left'}>
								<Text id="calendar.dialogs.printCalendar.DATE_RANGE_LABEL" />
							</AlignedLabel>
							<DateInput
								class={style.inputDefaultWidth}
								disabled={!dateRange.enabled}
								dateValue={moment(dateRange.from, DATE_FORMAT)}
								onDateChange={linkstate(this, 'dateRange.from')}
								invalid={invalidDate}
							/>
							<span class={style.spanSeparator}>
								<Text id="calendar.dialogs.printCalendar.TO_LABEL" />
							</span>
							<DateInput
								class={style.inputDefaultWidth}
								disabled={!dateRange.enabled}
								dateValue={moment(dateRange.to, DATE_FORMAT)}
								onDateChange={linkstate(this, 'dateRange.to')}
								invalid={invalidDate}
							/>
						</FormGroup>
						<hr class={style.separator} />
						<FormGroup class={style.paddingLeft}>
							<AlignedLabel align={'left'}>
								<Text id="calendar.dialogs.printCalendar.PRINT_VIEW_LABEL" />
							</AlignedLabel>
							<SelectOption
								class={cx(style.collapseLabel, style.inputDefaultWidth)}
								value={printView}
								onChange={linkstate(this, 'printView')}
							>
								{CALENDAR_PRINT_VIEWS.map(k => (
									<option value={k} key={k}>
										<Text
											id={`calendar.dialogs.printCalendar.PRINT_VIEW_${k.toUpperCase()}_LABEL`}
										/>
									</option>
								))}
							</SelectOption>
						</FormGroup>
						{(printView === VIEW_WEEK || printView === VIEW_DAY) && (
							<FormGroup class={style.paddingLeft}>
								<AlignedLabel align={'left'}>
									<Text id="calendar.dialogs.printCalendar.HOURS_LABEL" />
								</AlignedLabel>
								<div class={cx(style.collapseLabel, style.inputDefaultWidth)}>
									<TimePicker
										class={cx(style.timeSelect, style.inputDefaultWidth)}
										displayedTime={hoursRange.from}
										onUpdateTime={linkstate(this, 'hoursRange.from')}
										invalid={invalidHourRange}
									/>
								</div>
								<span class={style.spanSeparator}>
									<Text id="calendar.dialogs.printCalendar.TO_LABEL" />
								</span>
								<div class={cx(style.collapseLabel, style.inputDefaultWidth)}>
									<TimePicker
										class={cx(style.timeSelect, style.inputDefaultWidth)}
										displayedTime={hoursRange.to}
										onUpdateTime={linkstate(this, 'hoursRange.to')}
										invalid={invalidHourRange}
									/>
								</div>
							</FormGroup>
						)}
						<FormGroup class={style.paddingLeft}>
							<AlignedLabel align={'left'} class={style.alignTop}>
								<Text id="calendar.dialogs.printCalendar.OPTIONS_LABEL" />
							</AlignedLabel>
							<div>
								{printView === VIEW_WEEK && (
									<label class={style.optionLabel}>
										<ChoiceInput
											checked={printWorkDaysOnly}
											onChange={linkstate(this, 'printWorkDaysOnly')}
										/>
										<Text id="calendar.dialogs.printCalendar.PRINT_WORKDAYS_LABEL" />
									</label>
								)}
								{(printView === VIEW_MONTH ||
									printView === VIEW_WEEK ||
									printView === VIEW_DAY) && (
									<label class={style.optionLabel}>
										<ChoiceInput
											checked={printOneCalendarPerPage}
											onChange={linkstate(this, 'printOneCalendarPerPage')}
										/>
										<Text
											id={`calendar.dialogs.printCalendar.PRINT_ONE_${printView.toUpperCase()}_LABEL`}
										/>
									</label>
								)}
								<label class={style.optionLabel}>
									<ChoiceInput
										checked={includeMiniCalendar}
										onChange={linkstate(this, 'includeMiniCalendar')}
									/>
									<Text id="calendar.dialogs.printCalendar.MINI_CALENDAR_LABEL" />
								</label>
							</div>
						</FormGroup>
					</AlignedForm>
				</div>
			</ModalDialog>
		);
	}
}
