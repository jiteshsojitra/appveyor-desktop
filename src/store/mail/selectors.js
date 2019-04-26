export function getSelectedIds(state) {
	return state.mail.selectedIds;
}

export function getMailFolder(state, folderName) {
	return state.mail.conversations[folderName];
}
