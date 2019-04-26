import { h } from 'preact';
import s from './style.less';
import cx from 'classnames';

export default function TogglePreviousMail({ expandPrevMail, onTogglePreviousMail }) {
	function handleTogglePreviousMail() {
		onTogglePreviousMail(!expandPrevMail);
	}

	return (
		<span
			class={cx(
				s.previousMailToggle,
				expandPrevMail ? s.previousMailCollapse : s.previousMailExpand
			)}
			onClick={handleTogglePreviousMail}
		/>
	);
}
