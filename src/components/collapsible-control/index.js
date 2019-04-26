import { h } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';

import { Icon } from '@zimbra/blocks';

import s from './style.less';

const CollapsibleControl = ({ collapsed, ...rest }) => (
	<div {...rest} class={cx(s.collapsibleControl, !collapsed && s.open, rest.class)}>
		<Icon class={s.collapsibleIcon} name="angle-right" size="xs" />
	</div>
);

CollapsibleControl.defaultProps = {
	collapsed: false
};

CollapsibleControl.propTypes = {
	collapsed: PropTypes.bool
};

export default CollapsibleControl;
