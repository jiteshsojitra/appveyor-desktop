import { h } from 'preact';
import FixedPopover from '../fixed-popover';

const stopPropagation = e => e.stopPropagation();

const ContextMenu = props => (
	<FixedPopover
		enableClick={false}
		enableContextMenu
		popover={props.menu}
		popoverProps={{
			onContextMenu: stopPropagation
		}}
		{...props}
	/>
);

export default ContextMenu;
