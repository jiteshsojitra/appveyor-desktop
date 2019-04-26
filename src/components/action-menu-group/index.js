import { h } from 'preact';
import cx from 'classnames';

import s from './style.less';

const ActionMenuGroup = ({ children, ...rest }) => (
	<div {...rest} class={cx(s.group, rest.class)}>
		{children}
	</div>
);

export default ActionMenuGroup;
