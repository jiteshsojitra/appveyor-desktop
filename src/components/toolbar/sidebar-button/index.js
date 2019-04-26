import { h } from 'preact';
import ActionButton from '../../action-button';

import { connect } from 'preact-redux';
import { toggle as toggleSidebar } from '../../../store/sidebar/actions';

function SidebarButton(props) {
	return (
		<ActionButton
			icon="bars"
			monotone
			iconOnly
			onClick={props.toggleSidebar}
			className={props.className}
		/>
	);
}

export default connect(
	null,
	{ toggleSidebar }
)(SidebarButton);
