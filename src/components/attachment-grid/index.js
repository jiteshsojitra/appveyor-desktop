import { h } from 'preact';
import AttachmentItem from './item';
import AttachmentGridHeader from './header';
import { connect } from 'preact-redux';
import { compose } from 'recompose';
import { setPreviewAttachment } from '../../store/attachment-preview/actions';
import saveAs from '../../lib/save-as';
import saveAsZip from '../../lib/save-as-zip';

import s from './style.less';

function AttachmentGrid({
	attachments,
	removable,
	onPreview,
	onViewAll,
	onDownloadAll,
	onDownload,
	onRemove,
	onRemoveAll,
	hideAttachmentHeader,
	isLocalFilePath,
	hideAttachmentPreview = false,
	uploadingFiles = []
}) {
	const isUploading = !!uploadingFiles.length;
	return (
		<div>
			{!hideAttachmentHeader && (
				<AttachmentGridHeader
					attachments={attachments.concat(uploadingFiles)}
					removable={removable}
					onViewAll={onViewAll}
					onDownload={onDownload}
					onDownloadAll={onDownloadAll}
					onRemoveAll={onRemoveAll}
					isUploading={isUploading}
				/>
			)}
			<div class={s.attachments}>
				{uploadingFiles &&
					uploadingFiles.map(attachment => (
						<AttachmentItem
							attachment={attachment}
							hideAttachmentPreview={hideAttachmentPreview}
							isUploading={isUploading}
						/>
					))}
				{attachments &&
					attachments.map(attachment => (
						<AttachmentItem
							removable={removable}
							onDownload={onDownload}
							onRemove={onRemove}
							onPreview={onPreview}
							attachment={attachment}
							hideAttachmentPreview={hideAttachmentPreview}
							disableAction={isUploading}
							isLocalFilePath={isLocalFilePath}
						/>
					))}
			</div>
		</div>
	);
}

export default compose(
	connect(
		null,
		(dispatch, { attachments, onRemove }) => ({
			onPreview: attachment => dispatch(setPreviewAttachment(attachment, attachments)),
			onDownload: attachment => saveAs(attachment),
			onViewAll: () => dispatch(setPreviewAttachment(attachments[0], attachments)),
			onDownloadAll: () => saveAsZip(attachments),
			onRemoveAll: () => attachments.forEach(attachment => onRemove({ attachment }))
		})
	)
)(AttachmentGrid);
