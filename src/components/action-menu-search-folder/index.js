import { h, Component } from 'preact';
import cx from 'classnames';

import { specialFolders, customFolders } from '../../utils/folders';
import ActionMenu from '../action-menu';
import { FolderSearch } from '../folder-search';

import s from './style.less';

const ActionMenuSearchFolder = ({
	folders: allFolders,
	onSearchFolderChanged,
	onAdvancedSearch,
	label,
	searchInline
}) => {
	const folders = allFolders;
	const folderGroups = [specialFolders(folders), customFolders(folders)];

	return (
		<ActionMenu
			label={label}
			class={s.menu}
			actionButtonClass={cx(s.navigateDown, !searchInline && s.headerSearch)}
			popoverClass={s.popover}
		>
			<DropDown
				folders={folders}
				folderGroups={folderGroups}
				onChange={onSearchFolderChanged}
				onAdvancedSearch={onAdvancedSearch}
			/>
		</ActionMenu>
	);
};

class DropDown extends Component {
	handleSearch = name => {
		this.props.onChange(name);
		this.props.closeDropdown();
	};

	handleAdvancedSearch = () => {
		this.props.onAdvancedSearch();
		this.props.closeDropdown();
	};

	render({ folders, folderGroups }) {
		return (
			<FolderSearch
				folders={folders}
				folderGroups={folderGroups}
				onSearch={this.handleSearch}
				onAdvancedSearch={this.handleAdvancedSearch}
			/>
		);
	}
}

export default ActionMenuSearchFolder;
