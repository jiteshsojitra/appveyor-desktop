import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const InputHelperText = ({ children, error }) => (
	<div class={cx(s.helper, error && s.error)}>{children}</div>
);

export default InputHelperText;
