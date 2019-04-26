import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Icon } from '@zimbra/blocks';
import { graphql } from 'react-apollo';
import { compose } from 'recompose';
import differenceWith from 'lodash/differenceWith';
import differenceBy from 'lodash/differenceBy';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import find from 'lodash/find';
import { callWith } from '../../../lib/util';
import { Text } from 'preact-i18n';

import CalendarListItem from './item';
import CalendarListSection from './section';
import ContextMenu from '../../context-menu';
import { OtherCalendarsSectionContextMenu } from '../../context-menus';
import CalendarsQuery from '../../../graphql/queries/calendar/calendars.graphql';
import { withCalendars } from '../../../graphql-decorators/calendar';
import CalendarCheckMutation from '../../../graphql/queries/calendar/calendar-check.graphql';
import SendShareNotificationMutation from '../../../graphql/queries/shares/send-notification.graphql';

import { notify } from '../../../store/notifications/actions';
import { toggleFlag, hasFlag } from '../../../utils/folders';
import { CALENDAR_TYPE, ZIMBRA_GRANT_IDS, CALENDAR_TYPE_LIST } from '../../../constants/calendars';

import style from './style';
import { MODAL_ACTIONS } from '../constants';
import ZimletSlot from '../../zimlet-slot';

class CalendarList extends Component {
	state = {
		error: { visible: false, message: '', source: '' }
	};

	handleUpdateACL = (calendar, nextACL) => {
		const { folderAction, sendShareNotification } = this.props;
		const prevACL = calendar.acl || { grant: [] };
		const addGrants = differenceWith(nextACL.grant, prevACL.grant, isEqual);
		const removeGrants = differenceBy(
			differenceWith(prevACL.grant, nextACL.grant, isEqual),
			addGrants,
			'zimbraId'
		);

		return Promise.all([
			...addGrants.map(grant =>
				folderAction({
					op: 'grant',
					id: calendar.id,
					grant
				}).then(res =>
					grant.address
						? sendShareNotification({
								item: { id: calendar.id },
								address: { address: grant.address }
						  })
						: res
				)
			),
			...removeGrants.map(grant =>
				folderAction({
					op: '!grant',
					id: calendar.id,
					zimbraId: grant.zimbraId || ZIMBRA_GRANT_IDS[grant.granteeType]
				})
			)
		]).then(() => this.props.calendarsAndAppointmentsData.refetch());
	};

	renderSectionActionContent = ({ openContextMenu }) => (
		<Icon class={style.sectionActionButton} name="cog" size="sm" onClick={openContextMenu} />
	);

	renderSectionAction = sectionType => () => {
		if (CALENDAR_TYPE.own === sectionType) {
			return (
				<div onClick={callWith(this.props.openModal, MODAL_ACTIONS.createCalendar)}>
					<Icon class={style.sectionActionButton} name="plus" size="sm" />
				</div>
			);
		}

		if (CALENDAR_TYPE.other === sectionType) {
			return (
				<ContextMenu
					menu={
						<OtherCalendarsSectionContextMenu
							onAddFriendsCalendarClicked={callWith(
								this.props.openModal,
								MODAL_ACTIONS.createSharedCalendar
							)}
						/>
					}
					render={this.renderSectionActionContent}
				/>
			);
		}
	};

	renderListItem = calendar => {
		const {
			openModal,
			checkCalendar,
			accountInfoData,
			calendarsAndAppointmentsData,
			notify: displayNotification,
			changeFolderColor,
			matchesScreenMd,
			folderAction,
			trashCalendar,
			handleCustomCheckCalendar
		} = this.props;
		return (
			<CalendarListItem
				calendar={calendar}
				checkCalendar={checkCalendar}
				handleCustomCheckCalendar={handleCustomCheckCalendar}
				changeFolderColor={changeFolderColor}
				onUpdateACL={this.handleUpdateACL}
				calendarsAndAppointmentsData={calendarsAndAppointmentsData}
				accountInfoData={accountInfoData}
				folderAction={folderAction}
				trashCalendar={trashCalendar}
				notify={displayNotification}
				openModal={openModal}
				matchesScreenMd={matchesScreenMd}
			/>
		);
	};

	render({
		calendarSections,
		calendarsAndAppointmentsData,
		folderAction,
		matchesScreenMd,
		showGroupActions = true
	}) {
		const calendarListSelection = CALENDAR_TYPE_LIST.map(key => (
			<CalendarListSection
				key={key}
				type={key}
				items={calendarSections[key]}
				label={<Text id={`calendar.sidebar.calendarListLabel.${key}`} />}
				renderAction={this.renderSectionAction(key)}
				renderItem={this.renderListItem}
				showGroupActions={showGroupActions}
				initialExpanded={key === CALENDAR_TYPE.own}
				matchesScreenMd={matchesScreenMd}
			/>
		));

		return (
			<ul class={style.groupList}>
				{calendarListSelection}
				<ZimletSlot
					name="calendar-folder-list-end"
					items={calendarSections.holiday}
					renderItem={this.renderListItem}
					folderAction={folderAction}
					calendarsData={calendarsAndAppointmentsData}
					matchesScreenMd={matchesScreenMd}
				/>
				{!matchesScreenMd && (
					<li class={style.item}>
						<a href="" class={style.itemInner}>
							<Text id="tasks.Task.many" />
						</a>
					</li>
				)}
			</ul>
		);
	}
}

export default compose(
	connect(
		({ email = {} }) => ({
			username: get(email, 'account.name')
		}),
		{ notify }
	),
	withCalendars(),
	graphql(CalendarCheckMutation, {
		props: ({ ownProps: { calendars }, mutate }) => ({
			checkCalendar: id => {
				const calendarCheckedStatus = !hasFlag(
					find(calendars, {
						id
					}),
					'checked'
				);
				mutate({
					variables: {
						id,
						value: calendarCheckedStatus
					},
					optimisticResponse: {
						__typename: 'Mutation',
						checkCalendar: calendarCheckedStatus
					},
					update: cache => {
						const data = cache.readQuery({ query: CalendarsQuery });
						const cal = find(
							(get(data, 'getFolder.folders.0.folders') || []).concat(
								...(get(data, 'getFolder.folders.0.linkedFolders') || [])
							),
							{ id }
						);
						toggleFlag(cal, 'checked');
						cache.writeQuery({ query: CalendarsQuery, data });
					}
				});
			}
		})
	}),
	graphql(SendShareNotificationMutation, {
		props: ({ mutate }) => ({
			sendShareNotification: shareNotification => mutate({ variables: { shareNotification } })
		})
	})
)(CalendarList);
