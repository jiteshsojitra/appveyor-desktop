import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const Textarea = ({ wide, ...rest }) => (
	<textarea {...rest} class={cx(s.input, wide && s.wide, rest.class)} />
);

export default Textarea;
