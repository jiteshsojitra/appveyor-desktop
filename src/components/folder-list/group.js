import { h } from 'preact';
import PropTypes from 'prop-types';

import ContextMenu from '../context-menu';
import { FolderGroupContextMenu } from '../context-menus';
import CollapsibleControl from '../collapsible-control';

import s from './style.less';

const FolderGroup = ({
	children,
	name,
	onToggle,
	onCreateFolder,
	onFindFolder,
	collapsed,
	menu
}) => (
	<ContextMenu
		menu={
			menu && <FolderGroupContextMenu onCreateFolder={onCreateFolder} onFindFolder={onFindFolder} />
		}
	>
		<div class={s.groupToggle} onClick={onToggle}>
			<CollapsibleControl collapsed={collapsed} class={s.folderCollapsibleControl} />
			{name}
		</div>
		{!collapsed && <div class={s.groupChildren}>{children}</div>}
	</ContextMenu>
);

FolderGroup.defaultProps = {
	name: 'Folders',
	collapsed: false
};

FolderGroup.propTypes = {
	name: PropTypes.oneOf([PropTypes.string, PropTypes.node]),
	onToggle: PropTypes.func.isRequired,
	collapsed: PropTypes.boolean,
	children: PropTypes.node
};

export default FolderGroup;
