import { h, Component } from 'preact';
import { compose, branch, renderNothing } from 'recompose';

import { canMoveMessagesIntoFolders, specialFolders, customFolders } from '../../utils/folders';

import getMailFolders from '../../graphql-decorators/get-mail-folders';
import { getArchiveZimletMailboxMetadata } from '../../graphql-decorators/mailbox-metadata';
import ActionMenu from '../action-menu';
import FolderSelect from '../folder-select';
import { getAllowedFoldersForMove } from '../../utils/mail-list';
import withAccountConfigure from '../../utils/account-config';

const _ActionMenuMoveFolder = ({
	folders: allFolders,
	localFolders,
	disabled,
	onMove,
	iconOnly,
	arrow,
	monotone,
	actionButtonClass,
	popoverClass,
	flags,
	disableLocalFolderForMove
}) => {
	let folders = canMoveMessagesIntoFolders(allFolders);
	let _specialFolders = specialFolders(folders);

	if (flags) {
		folders = getAllowedFoldersForMove(flags, canMoveMessagesIntoFolders(allFolders)).filter(
			f => f.droppable
		);
		_specialFolders = specialFolders(folders);
	}

	const folderGroups = [customFolders(folders), _specialFolders];

	!disableLocalFolderForMove && localFolders && folderGroups.push(localFolders);

	return (
		<ActionMenu
			icon="folder-move"
			iconSize="md"
			label="Move"
			disabled={disabled}
			arrow={arrow}
			iconOnly={iconOnly}
			monotone={monotone}
			actionButtonClass={actionButtonClass}
			popoverClass={popoverClass}
		>
			<DropDown folders={folders} folderGroups={folderGroups} onMove={onMove} />
		</ActionMenu>
	);
};

const ActionMenuMoveFolder = compose(
	getMailFolders(),
	getArchiveZimletMailboxMetadata(),
	withAccountConfigure(),
	branch(({ folders }) => !folders, renderNothing)
)(_ActionMenuMoveFolder);

class DropDown extends Component {
	handleMove = (id, name) => {
		this.props.onMove(id, name);
		//closeDropdown is passed in by <ActionMenu/>
		this.props.closeDropdown();
	};

	render({ folders, folderGroups }) {
		return <FolderSelect folders={folders} folderGroups={folderGroups} onMove={this.handleMove} />;
	}
}

export default ActionMenuMoveFolder;
