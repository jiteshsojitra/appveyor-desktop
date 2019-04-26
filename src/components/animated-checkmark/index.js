import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const AnimatedCheckmark = ({ class: cls }) => (
	<svg class={cx(s.checkmark, cls)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
		<circle class={s.circle} cx="26" cy="26" r="25" fill="none" />
		<path class={s.check} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
	</svg>
);

export default AnimatedCheckmark;
