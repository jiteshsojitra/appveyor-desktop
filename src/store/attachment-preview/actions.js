import { createAction } from 'redux-actions';

export const setPreviewAttachment = createAction(
	'attachmentPreview setAttachmentPreview',
	(attachment, group) => ({ attachment, group })
);
export const previewNextPage = createAction('attachmentPreview previewNextPage');
export const previewPreviousPage = createAction('attachmentPreview previewPreviousPage');
