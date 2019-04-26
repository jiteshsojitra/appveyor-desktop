import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import { callWith, hexToRgb } from '../../lib/util';
import { STATUS_BUSY, STATUS_FREE, VIEW_MONTH } from './constants';
import CalendarEventContextMenu from './event-contextmenu';
import CloseButton from '../close-button';
import { CalendarEventDetails } from './event-details';
import cx from 'classnames';
import get from 'lodash/get';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { Popover } from '@zimbra/blocks';
import { deletePermissionCheck } from '../../utils/event';
import moment from 'moment';
import style from './style';

const SHOW_EVENT_DETAILS_AFTER_HOVER_DELAY = 1000;

function styledGradientBackground(color, freeBusy) {
	if (!(freeBusy === 'T' || freeBusy === 'F')) {
		return {};
	}

	const rgb = hexToRgb(color);
	const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .6)`;

	return {
		backgroundColor: rgba,
		backgroundImage: `linear-gradient(
			-45deg,
			${color} 25%,
			transparent 25%,
			transparent 50%,
			${color} 50%,
			${color} 75%,
			transparent 75%,
			transparent
		)`,
		backgroundSize: freeBusy === 'F' ? '40px 40px' : `10px 10px`
	};
}

export function getEventProps(event, start, end, isSelected) {
	return {
		className: cx(
			style.event,
			isSelected && style.isSelected,
			event.alarm && style.hasAlarm,
			event.freeBusy === STATUS_BUSY
				? style.isBusy
				: event.freeBusy === STATUS_FREE
				? style.isFree
				: null,
			event.new && style.quickAdd
		),
		style: {
			backgroundColor: event.color,
			...styledGradientBackground(event.color, event.freeBusy)
		}
	};
}

// Reverse RBC's adjustment factors to get back to a non-overlapping column layout for events.
function getAdjustedSize(cssStyle) {
	const height = parseFloat(cssStyle.height);
	const top = parseFloat(cssStyle.top);
	if (height) {
		cssStyle.height = `calc(${height}% - 2px)`;
	}
	cssStyle.top = `calc(${top}% + 1px)`;
	return cssStyle;
}

export function CalendarEventWrapper(props) {
	const child = props.children[0];
	if (child && child.props && child.props.style) {
		getAdjustedSize(child.props.style);
	}
	return child;
}

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatLT: `${timeFormats}.longDateFormat.LT`
	};
})
class SavedCalendarEvent extends Component {
	state = {
		active: false
	};

	handleToggle = active => this.setState({ active });

	handleClickClose = () => this.setState({ active: false });

	render({ view, title, event, matchesScreenMd, onEdit, onDelete, formatLT }, { active }) {
		const start = event.date;
		const eventPermissions = get(event, 'permissions', '');
		const writePermission = eventPermissions.includes('w');
		const hasWritePermission =
			!eventPermissions ||
			((event.class === 'PRI' && eventPermissions.includes('p') && writePermission) ||
				(event.class === 'PUB' && writePermission));
		const isSharedAndOrganizer = !event.owner || event.isOrganizer;
		const hasDeletePermission =
			!eventPermissions || deletePermissionCheck(eventPermissions, event.class);
		const body = (
			<CalendarEventContextMenu
				onEdit={isSharedAndOrganizer && hasWritePermission && onEdit}
				event={event}
				onDelete={hasDeletePermission && onDelete}
			>
				<div class={style.eventInner}>
					{view === VIEW_MONTH && matchesScreenMd && !event.allDay && (
						<time title={start}>
							{moment(start)
								.format(formatLT)
								.replace(':00', '')}
						</time>
					)}
					{title}
				</div>
			</CalendarEventContextMenu>
		);

		//Add clickable/hoverable popover for event details if not in a mobile viewport size
		return !matchesScreenMd ? (
			body
		) : (
			<Popover
				active={active}
				onToggle={this.handleToggle}
				arrow
				classes={{
					containerClass: style.eventTooltipTarget,
					toggleClass: style.eventTooltipTarget,
					popoverClass: style.eventTooltip
				}}
				placement="top"
				anchor="center"
				hoverDuration={SHOW_EVENT_DETAILS_AFTER_HOVER_DELAY}
				target={body}
			>
				<CloseButton class={style.close} onClick={this.handleClickClose} />
				<CalendarEventDetails
					event={event}
					onEdit={hasWritePermission && callWith(onEdit, event)}
					onDelete={hasDeletePermission && callWith(onDelete, event)}
				/>
			</Popover>
		);
	}
}

export default class QuickAddEvent extends Component {
	update = () => {
		this.props.event.onRender({
			bounds: this.base.getBoundingClientRect()
		});
	};

	componentDidMount() {
		this.update();
	}

	componentDidUpdate() {
		this.update();
	}

	render() {
		return (
			<div class={cx(style.eventInner, style.quickAddEvent)}>
				<Text id="calendar.event_no_title" />
			</div>
		);
	}
}

export function CalendarEvent(props) {
	return props.event.new ? <QuickAddEvent {...props} /> : <SavedCalendarEvent {...props} />;
}
