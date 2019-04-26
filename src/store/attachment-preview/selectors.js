export function getAttachmentPreviewVisibility(state) {
	return !!getSelectedAttachmentPreview(state);
}

export function getSelectedAttachmentPreview(state) {
	return state.attachmentPreview && state.attachmentPreview.group[state.attachmentPreview.selected];
}
