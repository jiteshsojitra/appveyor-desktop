import { h } from 'preact';
import cx from 'classnames';
import Tasks from '../../tasks';
import style from './style';

export default function CalendarRightbar({ class: cls, ...rest }) {
	return (
		<div class={cx(style.rightbar, cls)}>
			<Tasks {...rest} />
		</div>
	);
}
