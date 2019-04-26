import { h, Component } from 'preact';

import Header from './header';
import IndicatorTable from './indicator-table';

import { graphql } from 'react-apollo';
import FreeBusyQuery from '../../graphql/queries/calendar/free-busy.graphql';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';
import GetWorkingHoursQuery from '../../graphql/queries/calendar/working-hours.graphql';
import { callWith } from '../../lib/util';
import { merge as mergeFreeBusy } from '../../utils/free-busy';

import moment from 'moment';
import toPairs from 'lodash/toPairs';
import flatMap from 'lodash/flatMap';
import map from 'lodash/map';
import concat from 'lodash/concat';
import find from 'lodash/find';
import get from 'lodash/get';
import filter from 'lodash/filter';
import cloneDeep from 'lodash/cloneDeep';
import isString from 'lodash/isString';

import s from './style.less';
import { ATTENDEE_ROLE, CALENDAR_USER_TYPE } from '../../constants/calendars';
import findIndex from 'lodash/findIndex';

const freeBusyQueryVariables = ({ accountInfoData, attendees, event }) => ({
	names: concat(
		[accountInfoData.accountInfo.address],
		attendees.filter(attendee => !isString(attendee)).map(({ address }) => address)
	),
	start: moment(event.start)
		.startOf('day')
		.valueOf(),
	end: moment(event.start)
		.endOf('day')
		.valueOf()
});

@graphql(AccountInfoQuery, {
	props: ({ data: { accountInfo, ...rest } }) => {
		const {
			zimbraPrefFromDisplay: name,
			zimbraPrefFromAddress: address
		} = accountInfo.identities.identity[0]._attrs;
		return {
			accountInfoData: {
				accountInfo: { address, name },
				...rest
			}
		};
	}
})
@graphql(FreeBusyQuery, {
	skip: ({ accountInfoData }) =>
		!accountInfoData || accountInfoData.loading || accountInfoData.error,
	options: props => ({
		variables: freeBusyQueryVariables(props)
	}),
	props: ({
		ownProps: { attendees, accountInfoData, isForwardInvite, prevAttendees },
		data: { freeBusy = [], loading, ...rest }
	}) => {
		if (loading) {
			return {
				loading: true
			};
		}
		let userFreeBusy = freeBusy.map(({ id, __typename, ...statuses }) => {
			let statusInstances = flatMap(toPairs(statuses), ([status, events]) =>
				map(events, ({ start, end }) => ({
					status,
					start,
					end
				}))
			);

			// Remove any empty instances caused by null values created during
			// normalization, chronologically sort of statuses
			statusInstances = statusInstances.sort((instA, instB) => instA.start - instB.start);

			let attendee = find(attendees, ({ address }) => address === id);

			if (!attendee && id === accountInfoData.accountInfo.address) {
				// Create an attendee entry for the current user, as it's missing
				// from the array.
				attendee = {
					...accountInfoData.accountInfo,
					role: ATTENDEE_ROLE.required
				};
			}
			return {
				attendee,
				disableRequiredToggle: attendee.address === accountInfoData.accountInfo.address,
				statuses: filter(statusInstances, inst => inst && inst.start && inst.end),
				isRequired: !attendee || attendee.role === ATTENDEE_ROLE.required,
				disableToggle:
					isForwardInvite &&
					prevAttendees.some(prevAttendee => prevAttendee.address === attendee.address)
			};
		});

		if (!userFreeBusy.length) {
			// When freeBusy query has not resolved, fallback to using the raw attendee list
			// tobuild an empty table and prevent a scroll jump once the real data resolves.
			userFreeBusy = concat([accountInfoData.accountInfo], attendees).map(attendee => ({
				attendee,
				disableRequiredToggle: attendee.address === accountInfoData.accountInfo.address,
				statuses: [],
				isRequired: true
			}));
		}

		// re-order the array in which attendees + locations were added
		userFreeBusy.sort((a, b) => {
			const firstIndex = findIndex(attendees, ({ address }) => address === a.attendee.address);
			const secondIndex = findIndex(attendees, ({ address }) => address === b.attendee.address);
			return firstIndex - secondIndex;
		});

		// Create a mock attendee entry that represents the merged statuses of all
		// attendees.
		return {
			freeBusyData: {
				...rest,
				loading,
				freeBusy: userFreeBusy
			}
		};
	}
})
@graphql(GetWorkingHoursQuery, {
	skip: ({ accountInfoData, freeBusyData }) =>
		!accountInfoData || accountInfoData.loading || accountInfoData.error || !freeBusyData,
	options: props => ({
		variables: freeBusyQueryVariables(props)
	}),
	props: ({ ownProps: { freeBusyData }, data: { workingHours = [], loading, ...rest } }) => {
		if (loading) {
			return {
				loading: true
			};
		}
		const workingStatus = workingHours.map(({ id, __typename, ...statuses }) => {
			const workingStatusInstances = flatMap(toPairs(statuses), ([status, events]) =>
				map(events, ({ start, end }) => ({
					status,
					start,
					end
				}))
			);

			const statusToAdd = [];

			const addToStatus = instance => {
				const objectExists = statusToAdd.find(
					({ status, start, end }) =>
						status === instance.status && start === instance.start && end === instance.end
				);
				// Added (instance.start !== instance.end) check to skip instance which have same start and end as they don't makes any sense
				!objectExists &&
					instance.end &&
					instance.start &&
					instance.start !== instance.end &&
					statusToAdd.push(instance);
			};

			const currentFreeBusy = freeBusyData.freeBusy.find(({ attendee }) => attendee.address === id),
				freebusyStatuses = get(currentFreeBusy, 'statuses').filter(
					inst => inst && inst.start && inst.end
				),
				workingFreeStatuses = workingStatusInstances.filter(inst => inst.status === 'free'),
				freeStatus = 'free',
				nonWorkingStatus = 'nonworking';

			freebusyStatuses.forEach(({ status, start, end }, index) => {
				const startMoment = moment(start);
				const endMoment = moment(end);

				if (status === freeStatus) {
					if (workingFreeStatuses.length === 1) {
						const workingStart = workingFreeStatuses[0].start;
						const workingEnd = workingFreeStatuses[0].end;

						// start / End moment of freeBusy free statuses are being compared with working slots
						const startIsSameOrBeforeWorkingStart = startMoment.isSameOrBefore(workingStart);
						const endIsSameOrBeforeWorkingStart = endMoment.isSameOrBefore(workingStart);
						const endIsSameOrBeforeWorkingEnd = endMoment.isSameOrBefore(workingEnd);
						const startIsSameOrAfterWorkingStart = startMoment.isSameOrAfter(workingStart);
						const startIsSameOrAfterWorkingEnd = startMoment.isSameOrAfter(workingEnd);
						const endIsSameOrAfterWorkingEnd = endMoment.isSameOrAfter(workingEnd);

						if (startIsSameOrBeforeWorkingStart && endIsSameOrBeforeWorkingStart) {
							addToStatus({ status: nonWorkingStatus, start, end });
						} else if (startIsSameOrBeforeWorkingStart && endIsSameOrBeforeWorkingEnd) {
							addToStatus({ status: nonWorkingStatus, start, end: workingStart });
							addToStatus({ status: freeStatus, start: workingStart, end });
						} else if (startIsSameOrAfterWorkingStart && endIsSameOrBeforeWorkingEnd) {
							addToStatus({ status: freeStatus, start, end });
						} else if (startIsSameOrAfterWorkingEnd && endIsSameOrAfterWorkingEnd) {
							addToStatus({ status: nonWorkingStatus, start, end });
						} else if (startIsSameOrAfterWorkingStart && endIsSameOrAfterWorkingEnd) {
							addToStatus({ status: freeStatus, start, end: workingEnd });
							addToStatus({ status: nonWorkingStatus, start: workingEnd, end });
						} else if (startIsSameOrBeforeWorkingStart && endIsSameOrAfterWorkingEnd) {
							addToStatus({ status: nonWorkingStatus, start, end: workingStart });
							addToStatus({ status: freeStatus, start: workingStart, end: workingEnd });
							addToStatus({ status: nonWorkingStatus, start: workingEnd, end });
						}
					} else if (workingFreeStatuses.length === 2) {
						const workingFirstSlotStart = workingFreeStatuses[0].start;
						const workingFirstSlotEnd = workingFreeStatuses[0].end;
						const workingSecondSlotStart = workingFreeStatuses[1].start;
						const workingSecondSlotEnd = workingFreeStatuses[1].end;

						// start / End moment of freeBusy 'free' statuses are being compared with working slots
						const startIsSameOrAfterFirstSlotStart = startMoment.isSameOrAfter(
							workingFirstSlotStart
						);
						const endIsSameOrBeforeFirstSlotEnd = endMoment.isSameOrBefore(workingFirstSlotEnd);
						const startIsSameOrAfterSecondSlotStart = startMoment.isSameOrAfter(
							workingSecondSlotStart
						);
						const endIsSameOrBeforeSecondSlotEnd = endMoment.isSameOrBefore(workingSecondSlotEnd);
						const startIsSameOrAfterFirstSlotEnd = startMoment.isSameOrAfter(workingFirstSlotEnd);
						const endIsSameOrAfterFirstSlotEnd = endMoment.isSameOrAfter(workingFirstSlotEnd);
						const startIsSameOrBeforeFirstSlotEnd = startMoment.isSameOrBefore(workingFirstSlotEnd);
						const endIsSameOrBeforeSecondSlotStart = endMoment.isSameOrBefore(
							workingSecondSlotStart
						);
						const startIsSameOrBeforeSecondSlotStart = startMoment.isSameOrBefore(
							workingSecondSlotStart
						);
						const endIsSameOrAfterSecondSlotStart = endMoment.isSameOrAfter(workingSecondSlotStart);

						if (startIsSameOrAfterFirstSlotStart && endIsSameOrBeforeFirstSlotEnd) {
							addToStatus({ status: freeStatus, start, end });
						} else if (startIsSameOrAfterSecondSlotStart && endIsSameOrBeforeSecondSlotEnd) {
							addToStatus({ status: freeStatus, start, end });
						} else if (
							startIsSameOrAfterFirstSlotEnd &&
							endIsSameOrAfterFirstSlotEnd &&
							startIsSameOrBeforeSecondSlotStart &&
							endIsSameOrBeforeSecondSlotStart
						) {
							addToStatus({ status: nonWorkingStatus, start, end });
						} else if (
							startIsSameOrAfterFirstSlotStart &&
							startIsSameOrBeforeFirstSlotEnd &&
							endIsSameOrAfterFirstSlotEnd &&
							endIsSameOrBeforeSecondSlotStart
						) {
							addToStatus({ status: freeStatus, start, end: workingFirstSlotEnd });
							addToStatus({ status: nonWorkingStatus, start: workingFirstSlotEnd, end });
						} else if (
							startIsSameOrAfterFirstSlotEnd &&
							startIsSameOrBeforeSecondSlotStart &&
							endIsSameOrAfterSecondSlotStart &&
							endIsSameOrBeforeSecondSlotEnd
						) {
							addToStatus({ status: nonWorkingStatus, start, end: workingSecondSlotStart });
							addToStatus({ status: freeStatus, start: workingSecondSlotStart, end });
						} else if (
							startIsSameOrAfterFirstSlotStart &&
							endIsSameOrAfterSecondSlotStart &&
							startIsSameOrBeforeFirstSlotEnd &&
							endIsSameOrBeforeSecondSlotEnd
						) {
							addToStatus({ status: freeStatus, start, end: workingFirstSlotEnd });
							addToStatus({
								status: nonWorkingStatus,
								start: workingFirstSlotEnd,
								end: workingSecondSlotStart
							});
							addToStatus({ status: freeStatus, start: workingSecondSlotStart, end });
						}
					} else if (workingFreeStatuses.length === 0) {
						addToStatus({ status: nonWorkingStatus, start, end });
					}
				} else {
					addToStatus(freebusyStatuses[index]);
				}
			});

			return {
				...currentFreeBusy,
				statuses: statusToAdd.sort((instA, instB) => instA.start - instB.start)
			};
		});

		const allFreeBusy = {
			attendee: { name: 'All Invitees' },
			disableRequiredToggle: true,
			// Added (instance.start !== instance.end) check to skip instance which have same start and end as they don't makes any sense
			statuses: mergeFreeBusy(freeBusyData.freeBusy.map(({ statuses }) => statuses)).filter(
				inst => inst && inst.start && inst.end && inst.start !== inst.end
			),
			isRequired: true
		};

		return {
			workingHoursData: {
				...rest,
				loading,
				freeBusy: concat([allFreeBusy], workingStatus)
			}
		};
	}
})
export default class AvailabilityIndicator extends Component {
	onDayChange = dayModifier => {
		const availabilityDate = moment(this.props.event.start)
			.add(dayModifier, 'days')
			.valueOf();

		this.props.onStartChange(availabilityDate);
	};

	handleRefresh = () => this.props.freeBusyData.refetch(freeBusyQueryVariables(this.props));

	onChangeIsRequired = (attendee, newRole) => {
		const { forwardAttendees, isForwardInvite } = this.props;
		const attendees = cloneDeep(isForwardInvite ? forwardAttendees : this.props.attendees);
		const attendeeIdx = (isForwardInvite ? forwardAttendees : this.props.attendees).findIndex(
			a => a.address === attendee.address
		);
		if (attendeeIdx !== -1) {
			const updatedAttendee = {
				...attendees[attendeeIdx],
				role: newRole
			};
			attendees[attendeeIdx] = updatedAttendee;
			if (attendee.calendarUserType === CALENDAR_USER_TYPE.resource) {
				const locations = attendees.filter(a => a.calendarUserType === CALENDAR_USER_TYPE.resource);
				this.props.onLocationsChange({ value: locations });
			} else {
				this.props.onAttendeesChange({ value: attendees });
			}
		}
	};

	render({ event, workingHoursData }) {
		return (
			<div class={s.availabilityIndicator}>
				<Header
					onNextDay={callWith(this.onDayChange, 1)}
					onPrevDay={callWith(this.onDayChange, -1)}
					onRefresh={this.handleRefresh}
					onClose={this.props.onClose}
					value={event.start}
				/>
				<IndicatorTable
					onChangeIsRequired={this.onChangeIsRequired}
					event={event}
					freeBusy={workingHoursData && workingHoursData.freeBusy}
				/>
			</div>
		);
	}
}
