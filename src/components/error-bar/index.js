import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const ErrorBar = ({ children, ...rest }) => <div class={cx(s.error, rest.class)}>{children}</div>;

export default ErrorBar;
