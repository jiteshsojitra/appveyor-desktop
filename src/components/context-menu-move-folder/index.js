import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import { withText } from 'preact-i18n';

import {
	canMoveMessagesIntoFolders,
	customFolders,
	isChildFolder,
	SPECIAL_FOLDERS_WITHOUT_TRASH
} from '../../utils/folders';

import FolderSelect from '../folder-select';

import s from './style.less';
import { withProps } from 'recompose';
import { OUTBOX, DRAFTS, TRASH, JUNK } from '../../constants/folders';
function isFolderDisabled(folder, activeFolder) {
	return (
		folder.id === activeFolder.id ||
		folder.id === activeFolder.parentFolderId ||
		isChildFolder(activeFolder, folder.id)
	);
}

function withDisabledState(folders, activeFolder) {
	return folders.map(f => ({
		...f,
		disabled: isFolderDisabled(f, activeFolder),
		folder: withDisabledState(f.folder || [], activeFolder)
	}));
}
@withText({ localFolderName: 'folderlist.local_folder' })
@withProps(({ folders: allFolders, localFolders, activeFolder, localFolderName }) => {
	const folders = withDisabledState(canMoveMessagesIntoFolders(allFolders), activeFolder);
	if (process.env.ELECTRON_ENV) {
		const localFolderExists = localFolders && localFolders.length > 0;
		const absFolderPath = activeFolder.absFolderPath;
		folders.push({
			absFolderPath: '/' + localFolderName,
			name: localFolderName,
			disabled:
				localFolderExists ||
				(absFolderPath &&
					(absFolderPath.match(new RegExp('(^\\/' + TRASH + '\\/)')) ||
						absFolderPath.match(new RegExp('(^\\/' + DRAFTS + '\\/)')) ||
						absFolderPath.match(new RegExp('(^\\/' + JUNK + '\\/)')) ||
						absFolderPath.match(new RegExp('(^\\/' + OUTBOX + '\\/)')))),
			isLocalFolder: true,
			folders: localFolderExists
				? localFolders.map(f => ({
						...f,
						disabled: true
				  }))
				: null
		});
	}
	return {
		folders
	};
})
export default class ContextMenuMoveFolder extends Component {
	handleClick(e) {
		e.stopPropagation();
	}

	static propTypes = {
		folders: PropTypes.array,
		onMove: PropTypes.func,
		onCancelMove: PropTypes.func
	};

	render({ folders, onMove, onCancelMove }) {
		const folderGroups = [customFolders(folders, SPECIAL_FOLDERS_WITHOUT_TRASH)];

		return (
			<div onClick={this.handleClick}>
				<FolderSelect
					folders={folders}
					folderGroups={folderGroups}
					folderGroupClass={s.folderGroup}
					maxGroupHeight={200}
					onMove={onMove}
					onBack={onCancelMove}
				/>
			</div>
		);
	}
}
