import { h } from 'preact';
import cx from 'classnames';

import s from './style.less';

const Fill = ({ children, ...rest }) => <div class={cx(s.fill, rest.class)}>{children}</div>;

export default Fill;
