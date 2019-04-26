import { h, Component } from 'preact';
import moment from 'moment';
import startOfMonth from 'date-fns/start_of_month';
import isSameWeek from 'date-fns/is_same_week';
import endOfMonth from 'date-fns/end_of_month';
import style from './style';
import cx from 'classnames';
import { withText } from 'preact-i18n';

@withText({
	foramtWeekDay: 'timeFormats.dateFormats.foramtWeekDay'
})
export default class DateHeader extends Component {
	render({ label, date, isOffRange, onDrillDown, foramtWeekDay }) {
		const isFirstRow =
			isSameWeek(date, startOfMonth(date)) || (isOffRange && isSameWeek(date, endOfMonth(date)));
		return (
			<span class={cx(style.dateHeader, isOffRange && style.isOffRange)} onClick={onDrillDown}>
				{isFirstRow && <strong>{moment(date).format(foramtWeekDay)}</strong>}
				{label | 0}
			</span>
		);
	}
}
