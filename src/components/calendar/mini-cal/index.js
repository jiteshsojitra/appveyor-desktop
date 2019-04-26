import { h, Component } from 'preact';
import { callWith, toGroups } from '../../../lib/util';
import createLogicalGrid from '../../../lib/logical-grid';
import { KeyCodes, Select, Option } from '@zimbra/blocks';
import NakedButton from '../../naked-button';
import ActionButton from '../../action-button';
import isToday from 'date-fns/is_today';
import isSameDay from 'date-fns/is_same_day';
import isSameWeek from 'date-fns/is_same_week';
import isSameMonth from 'date-fns/is_same_month';
import getDay from 'date-fns/get_day';
import isSameYear from 'date-fns/is_same_year';
import startOfWeek from 'date-fns/start_of_week';
import startOfMonth from 'date-fns/start_of_month';
import startOfYear from 'date-fns/start_of_year';
import setMonth from 'date-fns/set_month';
import addDays from 'date-fns/add_days';
import subDays from 'date-fns/sub_days';
import addMonths from 'date-fns/add_months';
import addYears from 'date-fns/add_years';
import eachDay from 'date-fns/each_day';
import get from 'lodash/get';
import { VIEW_MONTH, VIEW_YEAR, VIEW_YEARS } from '../constants';
import cx from 'classnames';
import style from './style';
import { withProps } from 'recompose';
import flatten from 'lodash-es/flatten';
import throttle from 'lodash-es/throttle';
import { withText } from 'preact-i18n';
import moment from 'moment';
// A delay between repeated actions fired many times when a key is held down on
// the keyboard. The MonthView goes faster than other views.
const KEYDOWN_DELAY = 150;

const { LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW } = KeyCodes;

function movePointByKeycode(grid, [row, col], keyCode) {
	switch (keyCode) {
		case LEFT_ARROW: {
			if (col === 0) {
				// When wrapping to the left, go up by one row.
				row -= 1;
			}
			col -= 1;
			break;
		}
		case RIGHT_ARROW: {
			if (col === grid.numCols - 1) {
				// When wrapping to the right, go down by one row.
				row += 1;
			}
			col += 1;
			break;
		}
		case UP_ARROW: {
			row -= 1;
			break;
		}
		case DOWN_ARROW: {
			row += 1;
			break;
		}
	}

	return [row, col];
}

const toWeeks = toGroups(7);

const getMiniCalViewForCalendarView = calendarView =>
	VIEW_MAPPING[calendarView] || VIEW_MAPPING.default;

// Move by 1 year when paging in the years view
const YEARS_VIEW_PAGE_SIZE = 1;

const VIEW_MAPPING = {
	default: VIEW_MONTH,
	[VIEW_MONTH]: VIEW_YEAR,
	[VIEW_YEAR]: VIEW_YEARS
};

const VIEWS = {
	[VIEW_MONTH]: () => MonthView,
	[VIEW_YEAR]: () => YearView,
	[VIEW_YEARS]: () => YearsView
};
export default class MiniCal extends Component {
	state = {
		displayDate: this.props.date || new Date()
	};

	getView = () => {
		const { view, calendarView } = this.props;
		return view || getMiniCalViewForCalendarView(calendarView);
	};

	setDate = displayDate => {
		this.setState({ displayDate });
	};

	navigate = (date, displayOnly = false) => {
		if (date === 'TODAY') {
			this.setDate(this.props.date);
			this.props.onNavigate(new Date());
		} else if (date === 'NEXT' || date === 'PREV') {
			const view = getMiniCalViewForCalendarView(this.props.calendarView),
				offset =
					(date === 'NEXT' ? 1 : -1) *
					(view === VIEW_YEARS ? 12 * YEARS_VIEW_PAGE_SIZE : view === VIEW_YEAR ? 12 : 1),
				displayDate = addMonths(startOfMonth(this.state.displayDate), offset);

			this.setDate(displayDate);

			// Navigate the big calendar only on Years view
			if (this.getView() === VIEW_YEARS) {
				this.props.onNavigate(displayDate);
			}
		} else if (displayOnly) {
			this.setDate(date);
		} else {
			this.props.onNavigate(date);
		}
	};

	focus = () => {
		const activeElement = this.base.querySelector('button[tabindex="0"]');
		activeElement && activeElement.focus();
	};

	componentWillReceiveProps({ view, date }) {
		if (view !== this.props.view) {
			// if the view changed, go back to showing current.
			this.setDate(date);
		} else if (
			String(date) !== String(this.props.date) &&
			String(date) !== String(this.state.displayDate)
		) {
			// if the main calendar date changes, follow it.
			this.setDate(date);
		}
	}

	render(
		{ date, view, calendarView, onNavigate, selectionFollowsCursor, ...props },
		{ displayDate }
	) {
		view = this.getView();
		const CalendarView = VIEWS[view]();
		const childProps = {
			view,
			displayDate,
			onNavigate: this.navigate,
			disabled: props.disabled
		};
		return (
			<div
				{...props}
				class={cx(style.minical, props.class, style['fullCalendarView_' + calendarView])}
			>
				<MiniCalHeader {...childProps} />
				<CalendarView {...childProps} selectionFollowsCursor={selectionFollowsCursor} />
			</div>
		);
	}
}
@withText({
	formatYearLong: 'timeFormats.dateFormats.formatYearLong',
	formatMonthYearMedium: 'timeFormats.dateFormats.formatMonthYearMedium'
})
class MiniCalHeader extends Component {
	go = date => () => {
		this.props.onNavigate(date);
	};
	next = this.go('NEXT');
	prev = this.go('PREV');

	selectDate = ({ value }) => {
		this.props.onNavigate(startOfMonth(new Date(value)), this.props.view !== VIEW_YEARS);
	};

	render({ view, displayDate, disabled, formatYearLong, formatMonthYearMedium }) {
		const isYears = /^year/.test(view),
			titleFormat = isYears ? formatYearLong : formatMonthYearMedium,
			range = isYears ? 4 : 5,
			items = [];
		for (let offset = -range; offset <= range; offset++) {
			const d = (isYears ? addYears : addMonths)(displayDate, offset);
			items.push(<Option value={String(d)} title={moment(d).format(titleFormat)} />);
		}
		return (
			<header class={style.header}>
				{!disabled && (
					<ActionButton
						class={style.prev}
						monotone
						icon="angle-left"
						iconSize="sm"
						onClick={this.prev}
					/>
				)}
				{!disabled && (
					<ActionButton
						class={style.next}
						monotone
						icon="angle-right"
						iconSize="sm"
						onClick={this.next}
					/>
				)}
				<Select
					class={style.picker}
					iconPosition="none"
					toggleButtonClass={style.button}
					value={String(displayDate)}
					onChange={this.selectDate}
					anchor="right"
					disabled={disabled}
					displayValue={moment(displayDate).format(titleFormat)}
				>
					{items}
				</Select>
			</header>
		);
	}
}
@withText({
	foramtWeekDayMedium: 'timeFormats.dateFormats.foramtWeekDayMedium',
	formatDateDayShort: 'timeFormats.dateFormats.formatDateDayShort'
})
@withProps(({ displayDate, accountInfoData }) => {
	const preferences = get(accountInfoData, 'accountInfo.prefs');
	const weekStartsOn = preferences ? parseInt(preferences.zimbraPrefCalendarFirstDayOfWeek, 10) : 0,
		startOfMonthDate = startOfMonth(displayDate);
	let start = subDays(startOfWeek(startOfMonthDate, { weekStartsOn }), 7);

	if (getDay(startOfMonthDate) === weekStartsOn) {
		// Ensure there are always some days from the previous month
		start = subDays(start, 7);
	}

	// Calculate 8 weeks, but only render 6 weeks for the user.
	// The first and last weeks are hidden, they are only used for keyboard shortcuts
	const end = addDays(start, 55),
		dates = eachDay(start, end),
		weeks = dates.reduce(toWeeks, []);

	return { weeks };
})
class MonthView extends Component {
	// Magic numbers for computing grid bounds of keyboard inputs
	static numRows = 8;
	static numCols = 7;

	grid = createLogicalGrid(MonthView.numRows, MonthView.numCols, { wrapCols: true });

	findActivePoint = ({ displayDate, weeks }) =>
		this.grid.getPoint(flatten(weeks).findIndex(date => isSameDay(displayDate, date)));

	state = {
		activePoint: this.findActivePoint(this.props)
	};

	handleKeyDown = e => {
		const { activePoint } = this.state;
		const nextPoint = movePointByKeycode(this.grid, activePoint, e.keyCode);

		if (e.keyCode === KeyCodes.CARRIAGE_RETURN) {
			this.props.onNavigate(this.props.weeks[activePoint[0]][activePoint[1]]);
		} else if (activePoint[0] !== nextPoint[0] || activePoint[1] !== nextPoint[1]) {
			const [row, col] = this.grid.moveInbounds(nextPoint);

			e.preventDefault();

			this.moveCursor(this.props.weeks[row][col]);
			this.shouldRefocus = true;
		}

		this.props.onKeyDown && this.props.onKeyDown(e);
	};

	// Debounced moveCursor for keyboard shortcuts that can happen mutliple times per second
	moveCursor = throttle(date => {
		const { selectionFollowsCursor, onNavigate } = this.props;

		onNavigate && onNavigate(date, !selectionFollowsCursor);
	}, KEYDOWN_DELAY * 0.66);

	componentWillReceiveProps({ displayDate, weeks }) {
		if (String(this.props.displayDate) !== String(displayDate)) {
			this.setState({ activePoint: this.findActivePoint({ displayDate, weeks }) });
		}
	}

	componentDidUpdate() {
		if (this.shouldRefocus) {
			this.shouldRefocus = false;

			const focusable = this.base.querySelector('button[tabindex="0"]');
			focusable && focusable.focus();
		}
	}

	renderDayName = date => (
		<span class={cx(style.day, style.dayName)}>
			{moment(date).format(this.props.foramtWeekDayMedium)[0]}
		</span>
	);

	renderDay = date => {
		const { formatDateDayShort, displayDate, onNavigate } = this.props;
		return (
			<NakedButton
				class={cx(
					style.day,
					isToday(date) && style.today,
					isSameDay(date, displayDate) && style.current,
					!isSameMonth(date, displayDate) && style.outsideOfMonth
				)}
				tabindex={isSameDay(date, displayDate) ? '0' : '-1'}
				onClick={callWith(onNavigate, date)}
				onKeyDown={this.handleKeyDown}
				title={moment(date).format(formatDateDayShort)}
			>
				{date.getDate()}
			</NakedButton>
		);
	};

	renderWeek = days => (
		<div class={cx(style.week, isSameWeek(days[0], this.props.displayDate) && style.current)}>
			{days.map(this.renderDay)}
		</div>
	);

	render({ weeks = [] }) {
		return (
			<div class={style.monthView}>
				<div class={cx(style.week, style.dayNames)}>{weeks[0].map(this.renderDayName)}</div>
				{weeks.slice(1, -1).map(this.renderWeek)}
			</div>
		);
	}
}

@withProps(({ displayDate }) => {
	const start = startOfYear(displayDate);
	const months = [];
	for (let month = 0; month < 12; month++) {
		months.push(setMonth(start, month));
	}

	return { months };
})
@withText({
	customFormatMonthYearLong: 'timeFormats.dateFormats.customFormatMonthYearLong',
	formatMonthMedium: 'timeFormats.dateFormats.formatMonthMedium'
})
class YearView extends Component {
	// Magic numbers for computing grid bounds of keyboard inputs
	static numRows = 4;
	static numCols = 3;

	grid = createLogicalGrid(YearView.numRows, YearView.numCols, { wrap: true });

	findActiveIndex = ({ displayDate, months }) =>
		months.findIndex(month => isSameMonth(month, displayDate));

	state = {
		activeIndex: this.findActiveIndex(this.props)
	};

	handleKeyDown = e => {
		const { activeIndex } = this.state;
		const nextIndex = this.grid.getIndex(
			movePointByKeycode(this.grid, this.grid.getPoint(activeIndex), e.keyCode)
		);

		if (activeIndex !== nextIndex) {
			e.preventDefault();
			this.moveCursor(this.props.months[nextIndex]);
			this.shouldRefocus = true;
		}

		this.props.onKeyDown && this.props.onKeyDown(e);
	};

	// Debounced navigate for keyboard shortcuts that can happen mutliple times per second
	moveCursor = throttle(date => {
		const { selectionFollowsCursor, onNavigate } = this.props;
		onNavigate && onNavigate(date, !selectionFollowsCursor);
	}, KEYDOWN_DELAY);

	componentWillReceiveProps({ displayDate, months }) {
		if (String(this.props.displayDate) !== String(displayDate)) {
			this.setState({ activeIndex: this.findActiveIndex({ displayDate, months }) });
		}
	}

	componentDidUpdate() {
		if (this.shouldRefocus) {
			this.shouldRefocus = false;

			const focusable = this.base.querySelector('button[tabindex="0"]');
			focusable && focusable.focus();
		}
	}

	renderMonth = date => {
		const { customFormatMonthYearLong, formatMonthMedium } = this.props;
		return (
			<NakedButton
				class={cx(
					style.month,
					isSameMonth(date, new Date()) && style.today,
					isSameMonth(date, this.props.displayDate) && style.current
				)}
				tabindex={isSameMonth(date, this.props.displayDate) ? '0' : '-1'}
				onClick={callWith(this.props.onNavigate, date)}
				onKeyDown={this.handleKeyDown}
				title={moment(date).format(customFormatMonthYearLong)}
			>
				{moment(date).format(formatMonthMedium)}
			</NakedButton>
		);
	};

	render({ months }) {
		return <div class={style.yearView}>{months.map(this.renderMonth)}</div>;
	}
}

@withProps(({ displayDate }) => {
	const start = startOfYear(displayDate);
	const years = [];
	for (let offset = -4; offset <= 4; offset++) {
		years.push(addYears(start, offset));
	}
	return { years };
})
class YearsView extends Component {
	// Magic numbers for computing grid bounds of keyboard inputs
	static numRows = 3;
	static numCols = 3;
	static activeIndex = 4; // the active element in the YearsView is always centered

	grid = createLogicalGrid(YearsView.numRows, YearsView.numCols);

	handleKeyDown = e => {
		const { activeIndex } = YearsView;
		const nextIndex = this.grid.getIndex(
			movePointByKeycode(this.grid, this.grid.getPoint(activeIndex), e.keyCode)
		);

		if (activeIndex !== nextIndex) {
			e.preventDefault();
			this.moveCursor(this.props.years[nextIndex]);
		}

		this.props.onKeyDown && this.props.onKeyDown(e);
	};

	// Debounced navigate for keyboard shortcuts that can happen mutliple times per second
	moveCursor = throttle(date => {
		const { selectionFollowsCursor, onNavigate } = this.props;
		onNavigate && onNavigate(date, !selectionFollowsCursor);
	}, KEYDOWN_DELAY);

	renderYear = date => (
		<NakedButton
			class={cx(
				style.year,
				isSameYear(date, new Date()) && style.today,
				isSameYear(date, this.props.displayDate) && style.current
			)}
			tabindex={isSameYear(date, this.props.displayDate) ? '0' : '-1'}
			onClick={callWith(this.props.onNavigate, date)}
			onKeyDown={this.handleKeyDown}
			title={date.getFullYear()}
		>
			{date.getFullYear()}
		</NakedButton>
	);

	render({ years }) {
		return <div class={style.yearsView}>{years.map(this.renderYear)}</div>;
	}
}
