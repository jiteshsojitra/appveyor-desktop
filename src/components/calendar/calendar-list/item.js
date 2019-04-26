import { h, Component } from 'preact';
import { callWith } from '../../../lib/util';
import { hasFlag } from '../../../utils/folders';
import withDialog from '../../../enhancers/with-dialog';
import { CALENDAR_TYPE, CALENDAR_IDS } from '../../../constants/calendars';
import { calendarType as getCalendarType, colorForCalendar } from '../../../utils/calendar';
import { Icon, ChoiceInput } from '@zimbra/blocks';
import ContextMenu from '../../context-menu';
import ShareDialog from '../../share-dialog';
import { OtherCalendarContextMenu, CalendarContextMenu } from '../../context-menus';
import { MODAL_ACTIONS } from '../constants';

import s from './style.less';

@withDialog('showShareDialog', <ShareDialog />)
export default class CalendarListItem extends Component {
	onChangeColor = color => this.props.changeFolderColor(this.props.calendar.id, color);

	onDeleteLinkedCalendar = () => this.props.trashCalendar(this.props.calendar, true);

	onDeleteCalendar = calendar => this.props.trashCalendar(calendar);

	openImportModal = calendar =>
		this.props.openModal(MODAL_ACTIONS.importCalendarModal, {
			calendarName: calendar.name
		});

	onEditCalendar = calendar => this.props.openModal(MODAL_ACTIONS.createCalendar, { calendar });

	openExportModal = calendar =>
		this.props.openModal(MODAL_ACTIONS.exportCalendarModal, {
			calendarName: calendar.name
		});
	renderItem = ({ openContextMenu }) => {
		const { handleCustomCheckCalendar, checkCalendar, calendar, matchesScreenMd } = this.props;
		return (
			<div class={s.itemInner}>
				<label class={s.name}>
					<ChoiceInput
						checked={hasFlag(calendar, 'checked')}
						containerClass="coloredCheckbox"
						onClick={callWith(handleCustomCheckCalendar || checkCalendar, calendar.id)}
						inlineStyle={{ backgroundColor: colorForCalendar(calendar) }}
					/>
					{calendar.name}
					{!matchesScreenMd && (
						<Icon name="ellipsis-h" size="sm" onClick={openContextMenu} class={s.contextMenuIcon} />
					)}
				</label>
			</div>
		);
	};

	renderContextMenu = () => {
		const { calendar, showShareDialog, matchesScreenMd } = this.props;
		const calendarType = getCalendarType(calendar);
		const isHoliday = calendarType === CALENDAR_TYPE.holiday;
		const isOwn = calendarType === CALENDAR_TYPE.own;
		if (isOwn || isHoliday) {
			return (
				<CalendarContextMenu
					colorValue={calendar.color}
					onShare={!isHoliday && showShareDialog}
					// Import should not be visible for holiday calendars
					onImport={isOwn && callWith(this.openImportModal, calendar)}
					onExport={callWith(this.openExportModal, calendar)}
					onChangeColor={matchesScreenMd && this.onChangeColor}
					onDelete={!isHoliday && callWith(this.onDeleteCalendar, calendar)}
					onUnlink={isHoliday && callWith(this.onDeleteLinkedCalendar, calendar)}
					onEdit={callWith(this.onEditCalendar, calendar)}
					disableDelete={calendar.id === CALENDAR_IDS[CALENDAR_TYPE.own].DEFAULT}
					calendar={calendar}
				/>
			);
		}
		if (CALENDAR_TYPE.other === calendarType) {
			return (
				<OtherCalendarContextMenu
					colorValue={calendar.color}
					onEdit={callWith(this.onEditCalendar, calendar)}
					onChangeColor={matchesScreenMd && this.onChangeColor}
					onUnlink={this.onDeleteLinkedCalendar}
					onImport={callWith(this.openImportModal, calendar)}
					disableImport={calendar.permissions && !calendar.permissions.includes('w')}
					calendar={calendar}
				/>
			);
		}
	};

	render() {
		const menu = this.renderContextMenu();
		return (
			<li class={s.item}>
				<ContextMenu class={s.contextMenu} menu={menu} render={this.renderItem} />
			</li>
		);
	}
}
