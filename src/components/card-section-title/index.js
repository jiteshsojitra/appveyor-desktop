import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const CardSectionTitle = ({ children, class: cls }) => (
	<div class={cx(s.title, cls)}>{children}</div>
);

export default CardSectionTitle;
