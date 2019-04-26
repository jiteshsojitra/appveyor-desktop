import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';
import debounce from 'lodash-es/debounce';
import flatten from 'lodash-es/flatten';
import findIndex from 'lodash-es/findIndex';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';

import { KeyCodes } from '@zimbra/blocks';
import { flattenFolders, filteredFolders } from '../../utils/folders';

import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import ActionMenuFilter from '../action-menu-filter';

import s from './style.less';

class Folder extends Component {
	handleClick = e => {
		const { onClick, folder } = this.props;
		const folderId = folder.isLocalFolder ? 'isLocalFolder' : folder.id;
		return onClick(e, folderId, folder.name);
	};

	componentDidUpdate(prevProps) {
		if (this.props.selected && !prevProps.selected) {
			scrollIntoViewIfNeeded(this.base);
		}
	}

	render(props) {
		return (
			<div>
				<ActionMenuItem
					{...props}
					aria-selected={props.selected}
					class={cx(
						props.keyboardSelection && s.disableHover,
						props.selected && s.selected,
						props.class
					)}
					style={{ paddingLeft: `${props.depth * 14 + 18}px` }}
					onClick={this.handleClick}
					disabled={props.folder.disabled}
				>
					{props.folder.name}
				</ActionMenuItem>
				{props.folder.folders &&
					props.folder.folders.map(f => (
						<Folder
							{...props}
							folder={f}
							depth={props.depth + 1}
							selected={props.keyboardSelection === f.id}
						/>
					))}
			</div>
		);
	}
}

const FolderGroups = ({ groups, groupClass, ...rest }) => (
	<div>
		{groups.map(
			group =>
				group &&
				group.length > 0 && (
					<ActionMenuGroup class={cx(s.folderGroup, groupClass)}>
						{group.map(f => (
							<Folder {...rest} depth={1} folder={f} selected={rest.keyboardSelection === f.id} />
						))}
					</ActionMenuGroup>
				)
		)}
	</div>
);

function selectOffsetFolder(folderGroups, currentId, offset = 1) {
	const folders = flattenFolders(flatten(folderGroups)).filter(f => !f.disabled);
	if (!folders.length) {
		return null;
	}

	const index = findIndex(folders, f => f.id === currentId);
	if (index === -1 && offset >= 1) {
		return folders[0].id;
	}
	if (index === 0 && offset <= -1) {
		return currentId;
	}

	const nextFolder = folders[index + offset];
	return (nextFolder && nextFolder.id) || currentId;
}

export default class FolderSelect extends Component {
	state = {
		filterValue: '',
		keyboardSelection: null // [<groupIndex>, <itemIndex>]
	};

	handleFilterChange = debounce((e, folders) => {
		const value = e.target.value;
		const newFolderGroups = [filteredFolders(folders, value)];
		const newSelection = value === '' ? null : selectOffsetFolder(newFolderGroups, null, 1);

		this.setState({
			filterValue: value,
			keyboardSelection: newSelection
		});
	}, 225);

	handleFilterKeydown = e => {
		if (e.keyCode === KeyCodes.DOWN_ARROW || e.keyCode === KeyCodes.UP_ARROW) {
			e.preventDefault();

			if (e.keyCode === KeyCodes.DOWN_ARROW) {
				this.handleKeyboardNavigation(e, this.folderGroups, 1);
			} else if (e.keyCode === KeyCodes.UP_ARROW) {
				this.handleKeyboardNavigation(e, this.folderGroups, -1);
			}
		}
	};

	handleFilterKeyup = e => {
		if (e.keyCode === 13) {
			this.handleKeyboardEnter(e);
		} else if (e.keyCode !== KeyCodes.DOWN_ARROW && e.keyCode !== KeyCodes.UP_ARROW) {
			this.handleFilterChange(e, this.props.folders);
		}
	};

	handleKeyboardNavigation = (e, folderGroups, offset = 1) => {
		const { keyboardSelection } = this.state;

		this.setState({
			keyboardSelection: selectOffsetFolder(folderGroups, keyboardSelection, offset)
		});
	};

	clearFilter = () => {
		if (this.state.filterValue !== '') {
			this.setState({ filterValue: '' });
		}
	};

	clearKeyboardSelection = e => {
		// When programatically scrolling for keyboard selection, do not
		// clear the selection
		if (e.movementX === 0 && e.movementY === 0) {
			return;
		}

		if (this.state.keyboardSelection !== null) {
			this.setState({ keyboardSelection: null });
		}
	};

	handleKeyboardEnter = () => {
		if (!this.state.keyboardSelection) {
			return;
		}
		this.moveItem(this.state.keyboardSelection);
	};

	handleItemClick = (e, id, name) => {
		e.stopPropagation();
		this.moveItem(id, name);
	};

	handleClearFilter = () => {
		this.clearState();
	};

	moveItem = (id, name) => {
		this.clearState();
		this.props.onMove(id, name);
	};

	clearState = () => {
		this.setState({
			filterValue: '',
			keyboardSelection: null
		});
	};

	static propTypes = {
		folders: PropTypes.array,
		onMove: PropTypes.func.isRequired
	};

	render(
		{ folders, onMove, folderGroupClass, onBack, ...rest },
		{ filterValue, keyboardSelection }
	) {
		const folderGroups =
			filterValue !== '' ? [filteredFolders(folders, filterValue)] : rest.folderGroups;

		return (
			<div>
				<ActionMenuFilter
					value={filterValue}
					onKeydown={this.handleFilterKeydown}
					onKeyup={this.handleFilterKeyup}
					onBack={onBack}
					onClear={this.handleClearFilter}
					placeholderTextId="mail.folders.FIND_PLACEHOLDER"
				/>

				<FolderGroups
					groups={folderGroups}
					keyboardSelection={keyboardSelection}
					onClick={this.handleItemClick}
					onMouseEnter={this.clearKeyboardSelection}
					groupClass={folderGroupClass}
				/>
			</div>
		);
	}
}
