import { h, Component } from 'preact';
import { callWith } from '../../../lib/util';
import { Text, withText } from 'preact-i18n';
import moment from 'moment';
import ActionButton from '../../action-button';
import ActionMenu, { DropDownWrapper } from '../../action-menu';
import ActionMenuItem from '../../action-menu-item';
import ActionMenuGroup from '../../action-menu-group';
import { CALENDAR_VIEWS, VIEW_WEEK, VIEW_AGENDA, VIEW_YEAR, MODAL_ACTIONS } from '../constants';
import withMediaQuery from '../../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../../constants/breakpoints';
import cx from 'classnames';
import style from './style';
import { configure } from '../../../config';
import Search from '../../search';
import ZimletSlot from '../../zimlet-slot';

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@configure('searchInline, showPrint')
@withText({
	formatMonthYearLong: 'timeFormats.dateFormats.formatMonthYearLong'
})
class CalendarToolbar extends Component {
	handleAction = actionType => actionType && this.props.openModal(actionType);

	render({
		searchInline,
		view,
		date,
		label,
		onNavigate,
		onViewChange,
		matchesScreenMd,
		showPrint,
		calendarsData,
		folderAction,
		getCalendarType,
		formatMonthYearLong
	}) {
		if (view === VIEW_AGENDA) {
			label = moment(date).format(formatMonthYearLong);
		} else if (view === VIEW_YEAR) {
			label = date.getFullYear();
		}

		return (
			<div class={style.toolbar}>
				<div class={cx(style.toolbarTop, !matchesScreenMd && style.centered)}>
					{searchInline && matchesScreenMd && (
						<div class={style.inline}>
							<Search showDropDown searchInline={searchInline} />
						</div>
					)}
					{matchesScreenMd && (
						<ActionButton class={style.viewButton} monotone onClick={callWith(onNavigate, 'TODAY')}>
							<Text id="calendar.today" />
						</ActionButton>
					)}
					<span>
						{CALENDAR_VIEWS.filter(viewName =>
							!matchesScreenMd ? viewName !== VIEW_WEEK : true
						).map(viewName => (
							<ActionButton
								class={cx(style.viewButton, view === viewName && style.current)}
								disabled={view === viewName}
								onClick={callWith(onViewChange, viewName)}
							>
								<Text id={'calendar.views.' + viewName}>{viewName}</Text>
							</ActionButton>
						))}
					</span>
					{matchesScreenMd && (
						<ActionsMenuButton
							onAction={this.handleAction}
							showPrint={showPrint}
							folderAction={folderAction}
							calendarsData={calendarsData}
							getCalendarType={getCalendarType}
							matchesScreenMd={matchesScreenMd}
						/>
					)}
				</div>
				<div class={style.toolbarBottom}>
					<ActionButton
						icon="angle-left"
						iconSize="sm"
						monotone
						onClick={callWith(onNavigate, 'PREV')}
					/>
					<ActionButton
						icon="angle-right"
						iconSize="sm"
						monotone
						onClick={callWith(onNavigate, 'NEXT')}
					/>
					<h3>{label}</h3>
				</div>
			</div>
		);
	}
}

export default CalendarToolbar;

const ActionsMenuButton = ({
	onAction,
	showPrint,
	matchesScreenMd,
	calendarsData,
	folderAction
}) => (
	<ActionMenu
		class={style.actionsMenuButton}
		icon="ellipsis-h"
		label={<Text id="calendar.actions.BUTTON" />}
	>
		<DropDownWrapper>
			{showPrint && (
				<ActionMenuGroup>
					<ActionMenuItem onClick={callWith(onAction, MODAL_ACTIONS.printCalendarModal)}>
						<Text id="calendar.actions.PRINT" />
					</ActionMenuItem>
				</ActionMenuGroup>
			)}
			<ActionMenuGroup>
				<ActionMenuItem onClick={callWith(onAction, MODAL_ACTIONS.createCalendar)}>
					<Text id="calendar.actions.NEW_CALENDAR" />
				</ActionMenuItem>
			</ActionMenuGroup>
			<ActionMenuGroup>
				<ZimletSlot
					name="calendar-context-add-holiday"
					calendarsData={calendarsData}
					folderAction={folderAction}
					matchesScreenMd={matchesScreenMd}
				/>
				<ActionMenuItem onClick={callWith(onAction, MODAL_ACTIONS.createSharedCalendar)}>
					<Text id="calendar.actions.ADD_SHARED_CALENDAR" />
				</ActionMenuItem>
			</ActionMenuGroup>
		</DropDownWrapper>
	</ActionMenu>
);
