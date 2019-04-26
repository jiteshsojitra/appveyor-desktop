import { h, Component } from 'preact';
import SidebarPrimaryButton from '../../sidebar-primary-button';
import MiniCal from '../mini-cal';
import Sidebar from '../../sidebar';
import CalendarList from '../calendar-list';
import style from './style';
import cx from 'classnames';
import { LeftSideAdSlot } from '../../ad-slots';

export default class CalendarSidebar extends Component {
	handleSidebarScroll = e => {
		this.setState({
			isSidebarScrolled: e.target.scrollTop !== 0
		});
	};

	state = {
		isSidebarScrolled: false
	};

	render(
		{
			date,
			view,
			onNavigate,
			openModal,
			onCreateNew,
			calendarsAndAppointmentsData,
			accountInfoData,
			matchesScreenMd,
			changeFolderColor,
			checkCalendar,
			trashCalendar,
			folderAction
		},
		{ isSidebarScrolled }
	) {
		return (
			<Sidebar header={!matchesScreenMd}>
				{matchesScreenMd && (
					<div class={cx(style.sidebarHeader, isSidebarScrolled && style.boxShadow)}>
						<SidebarPrimaryButton textId="calendar.newEvent" onClick={onCreateNew} />
					</div>
				)}
				<div class={style.sidebarListWrapper} onscroll={this.handleSidebarScroll}>
					{matchesScreenMd && (
						<MiniCal
							selectionFollowsCursor
							calendarView={view}
							date={date}
							onNavigate={onNavigate}
							accountInfoData={accountInfoData}
						/>
					)}
					<CalendarList
						openModal={openModal}
						calendarsAndAppointmentsData={calendarsAndAppointmentsData}
						accountInfoData={accountInfoData}
						matchesScreenMd={matchesScreenMd}
						changeFolderColor={changeFolderColor}
						checkCalendar={checkCalendar}
						trashCalendar={trashCalendar}
						folderAction={folderAction}
					/>
				</div>
				<LeftSideAdSlot />
			</Sidebar>
		);
	}
}
