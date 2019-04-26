import { h, Component } from 'preact';
import { Icon, Spinner, Button } from '@zimbra/blocks';
import ErrorAlert from '../../error-alert';
import { Text, withText } from 'preact-i18n';
import get from 'lodash/get';
import style from './style';
import cx from 'classnames';
import Recurrence from '../../recurrence';
import { adjustTimeToLocalTimeZone } from '../../../utils/invitation';
import { withAppointmentData } from '../../../graphql-decorators/calendar';
import withAccountInfo from '../../../graphql-decorators/account-info';
import { notify } from '../../../store/notifications/actions';
import { connect } from 'preact-redux';
import CalendarInvitation from './calendar-invitation';

@withAppointmentData()
@connect(
	null,
	{ notify }
)
@withAccountInfo()
@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatMediumLLLL: `${timeFormats}.longDateFormat.mediumLLLL`,
		formatLongHourLT: `${timeFormats}.longDateFormat.longHourLT`,
		formatDateLong: 'timeFormats.dateFormats.formatDateLong',
		formatDateMedium: 'timeFormats.dateFormats.formatDateMedium',
		formatMonthLong: 'timeFormats.dateFormats.formatMonthLong'
	};
})
export default class CalendarEventDetails extends Component {
	componentWillReceiveProps({ appointmentData }) {
		//If we are in a pop-over, tell the popover to reposition properly after we render our final appointment data
		if (
			this.props.scheduleUpdate &&
			appointmentData.loading !== this.props.appointmentData.loading
		) {
			this.setState({}, this.props.scheduleUpdate);
		}
	}

	render({
		event,
		appointmentData,
		onPrint,
		onDelete,
		onEdit,
		formatMediumLLLL,
		formatLongHourLT,
		formatDateLong,
		formatDateMedium,
		formatMonthLong,
		...props
	}) {
		// @TODO move all computational logic to @withProps decorator
		const inviteComponent = get(appointmentData, 'message.invitations.0.components.0');
		const recurrence = get(inviteComponent, 'recurrence.0');
		const excerpt = get(event, 'excerpt');
		const date =
			inviteComponent &&
			adjustTimeToLocalTimeZone(
				inviteComponent,
				formatMediumLLLL,
				formatLongHourLT,
				formatMonthLong,
				formatDateLong,
				formatDateMedium
			); // llll format in moment : ddd, MMM DD, YYYY hh:mm A
		const isSharedAndOrganizer = !event.owner || event.isOrganizer;

		const error = appointmentData.error;
		error && console.error(error);
		return (
			<div {...props} class={cx(style.eventDetails, props.class)}>
				<h2>{event.name}</h2>

				<div>
					{error && (
						<ErrorAlert>
							<Text id="calendar.editModal.notifications.problemInFetching" />
						</ErrorAlert>
					)}
				</div>

				{event.location && (
					<div class={style.location}>
						<Text id="prepositions.at" />
						&nbsp;
						{event.location}
					</div>
				)}

				<div class={style.time}>
					<time>{date}</time>
					{<Icon size="xs" name={`bell${event.alarm ? '' : '-slash'}`} />}
				</div>

				{!event.isOrganizer && event.organizer && event.organizer.address && (
					<div class={style.organizer}>
						<Text id="calendar.eventFields.organizer" />
						{': '}
						{event.organizer.address}
					</div>
				)}
				{appointmentData && (
					<CalendarInvitation
						message={appointmentData.message}
						inviteId={event.inviteId}
						owner={event.owner}
						calendarId={event.calendarId}
						permission={event.permissions}
					/>
				)}
				<hr />

				<ul class={style.parentCalendar}>
					<li>
						<span role="img" style={`background-color: ${event.color}`} />
						{event.parentFolderName}
					</li>
				</ul>

				<ul class={style.flags}>
					{event.isRecurring && (
						<li>
							<Icon size="sm" name="repeat" />
							&nbsp;
							<Recurrence recurrence={recurrence} startTime={event.start} />
						</li>
					)}
					{event.class === 'PRI' && (
						<li>
							<Icon size="sm" name="lock" />
							<Text id="buttons.private" />
						</li>
					)}
				</ul>

				{appointmentData.loading ? (
					<Spinner class={style.spinner} block />
				) : (
					excerpt && <p>{excerpt}</p>
				)}

				{isSharedAndOrganizer && onEdit && (
					<Button onClick={onEdit}>
						<Text id="buttons.edit" />
					</Button>
				)

				/*<Button onClick={callWith(onPrint, event)}>
					<Text id="buttons.print" />
				</Button>*/
				}
				{onDelete && (
					<Button onClick={onDelete}>
						<Text id="buttons.delete" />
					</Button>
				)}
			</div>
		);
	}
}
