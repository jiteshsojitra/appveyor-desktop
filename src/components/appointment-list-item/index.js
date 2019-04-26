import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';
import moment from 'moment';
import ContextMenu from '../context-menu';
import AppointmentPopover from '../appointment-popover';
import colors from '../../constants/colors';
import style from './style.less';

@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatLT: `${timeFormats}.longDateFormat.LT`,
		formatDateYearMedium: 'timeFormats.dateFormats.formatDateYearMedium'
	};
})
export default class AppointmentListItem extends Component {
	handleClick = e => {
		const { onClick, item } = this.props;
		onClick({ item, loc: { top: e.y, left: e.x } });
	};

	renderItem = ({ openContextMenu }) => {
		const { calendar, startDate, item, formatLT, formatDateYearMedium } = this.props;
		return (
			<div class={style.listItem} onClick={openContextMenu}>
				<p>
					{!startDate || startDate === '' ? null : moment(startDate).format(formatDateYearMedium)}
				</p>

				{!this.props.isTask ? (
					<p>
						{`${moment(startDate).format(formatLT)} - ${moment(startDate + item.duration).format(
							formatLT
						)}`}
					</p>
				) : (
					<p>
						<Text id="tasks.Task.one" />
					</p>
				)}
				<p>
					{!this.props.isTask && (
						<div class={style.colorInputContainer}>
							<div
								class={style.colorInput}
								style={{
									backgroundColor: calendar ? colors[calendar.color] : colors['0']
								}}
							/>
						</div>
					)}
					{item.name}
				</p>
				{item.alarm === true ? (
					<div class={style.hasAlarmContainer}>
						<Icon class={style.hasAlarmBtn} name="bell" size="sm" />
					</div>
				) : (
					<p />
				)}
			</div>
		);
	};

	render = ({ item, calendar }) => (
		<ContextMenu
			render={this.renderItem}
			menu={<AppointmentPopover id={item.id} calendar={calendar} searchResult={item} />}
			persistent
			isPopover
		/>
	);
}
