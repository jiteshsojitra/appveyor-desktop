import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';
import flatten from 'lodash-es/flatten';
import findIndex from 'lodash-es/findIndex';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import { Text } from 'preact-i18n';

import { KeyCodes } from '@zimbra/blocks';
import { flattenFolders, filteredFolders } from '../../utils/folders';

import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';

import s from './style.less';

class Folder extends Component {
	handleClick = e => this.props.onClick(e, this.props.folder.absFolderPath.replace('/', ''));

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

const SearchFolderGroups = ({
	onAllMail,
	folderGroups,
	specialFolders,
	customFolders,
	groupClass,
	onAdvancedSearch,
	...rest
}) => (
	<div>
		<div className={s.searchIn}>
			<Text id="search.scope.search_in" />
		</div>
		<ActionMenuGroup>
			<div class={cx(s.searchFolderGroup, groupClass)}>
				<ActionMenuItem onClick={onAllMail}>
					<div className={s.allMail}>
						<Text id="search.scope.all_mail" />
					</div>
				</ActionMenuItem>
				<div>
					{specialFolders.map(f => (
						<div className={s.specialFolder}>
							<Folder {...rest} depth={1} folder={f} selected={rest.keyboardSelection === f.id} />
						</div>
					))}
				</div>
				<div>
					<p class={cx(s.title)}>
						<Text id="folderlist.folders" />
					</p>
					{customFolders.map(f => (
						<div className={s.otherFolders}>
							<Folder {...rest} depth={1} folder={f} selected={rest.keyboardSelection === f.id} />
						</div>
					))}
				</div>
			</div>
		</ActionMenuGroup>
		<ActionMenuGroup>
			<ActionMenuItem className={s.advanceSearch} onClick={onAdvancedSearch}>
				<div>
					<Text id="search.scope.advanced_search" />
				</div>
			</ActionMenuItem>
		</ActionMenuGroup>
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

export class FolderSearch extends Component {
	state = {
		filterValue: '',
		keyboardSelection: null // [<groupIndex>, <itemIndex>]
	};

	handleFilterChange = (e, folders) => {
		const value = e.target.value;
		const newFolderGroups = [filteredFolders(folders, value)];
		const newSelection = value === '' ? null : selectOffsetFolder(newFolderGroups, null, 1);

		this.setState({
			filterValue: value,
			keyboardSelection: newSelection
		});
	};

	allFolderSearch = () => {
		this.props.onSearch(null, 'All');
	};

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
		this.searchItem(this.state.keyboardSelection);
	};

	handleItemClick = (e, name) => {
		e.stopPropagation();
		this.searchItem(name);
	};

	handleClearFilter = () => {
		this.clearState();
	};

	searchItem = name => {
		this.clearState();
		this.props.onSearch(name);
	};

	clearState = () => {
		this.setState({
			filterValue: '',
			keyboardSelection: null
		});
	};

	static propTypes = {
		folders: PropTypes.array,
		onSearch: PropTypes.func.isRequired
	};

	render(
		{ folders, onSearch, onAdvancedSearch, folderGroupClass, onBack, ...rest },
		{ filterValue, keyboardSelection }
	) {
		const folderGroups =
			filterValue !== '' ? [filteredFolders(folders, filterValue)] : rest.folderGroups;
		const [specialFolders, customFolders] = rest.folderGroups;

		return (
			<div>
				<SearchFolderGroups
					folderGroups={folderGroups}
					specialFolders={specialFolders}
					customFolders={customFolders}
					keyboardSelection={keyboardSelection}
					onClick={this.handleItemClick}
					onMouseEnter={this.clearKeyboardSelection}
					groupClass={folderGroupClass}
					onAllMail={this.allFolderSearch}
					onAdvancedSearch={onAdvancedSearch}
				/>
			</div>
		);
	}
}
