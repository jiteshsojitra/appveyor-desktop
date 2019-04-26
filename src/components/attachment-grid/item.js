import { h, Component } from 'preact';
import AttachmentBadge from '../attachment-badge';
import { Icon } from '@zimbra/blocks';

import s from './style.less';
import cx from 'classnames';
import { formatBytes } from '../../lib/util';

const formatFilename = (fileName, { maxWidth, fontSize }) => {
	const extensionPivotIdx = fileName.lastIndexOf('.');

	const ruler = document.createElement('span');
	ruler.style.visibility = 'hidden';
	ruler.style.whitespace = 'nowrap';
	ruler.style.fontSize = fontSize + 'px';
	document.body.appendChild(ruler);
	ruler.innerHTML = fileName;
	// no truncation needed, filname fits in container.
	if (ruler.offsetWidth < maxWidth) {
		return fileName;
	}

	let [name, extension] =
		extensionPivotIdx !== -1
			? [fileName.slice(0, extensionPivotIdx), fileName.slice(extensionPivotIdx + 1)]
			: [fileName, ''];

	// truncate the name part of the filename, preserving the extension,
	// until it fits in the container.
	ruler.innerHTML = name + '...' + extension;
	while (ruler.offsetWidth > maxWidth) {
		name = name.slice(0, name.length - 1);
		ruler.innerHTML = name + '...' + extension;
	}
	const output = ruler.innerHTML;
	document.body.removeChild(ruler);
	return output;
};

export default class AttachmentTile extends Component {
	onRemove = () => {
		const { onRemove, attachment } = this.props;
		onRemove({ attachment });
	};

	onPreview = () => {
		const { onPreview, attachment, hideAttachmentPreview } = this.props;
		!hideAttachmentPreview && onPreview(attachment);
	};

	onDownload = () => {
		const { onDownload, attachment } = this.props;
		onDownload(attachment);
	};

	componentDidMount() {
		const { attachment } = this.props;
		if (attachment) {
			const filename = attachment.filename || attachment.name || 'Unnamed';
			// eslint-disable-next-line react/no-did-mount-set-state
			this.setState({
				filename,
				formattedFilename: formatFilename(filename, {
					maxWidth: 90,
					fontSize: 12
				})
			});
		}
	}

	componentWillReceiveProps(nextProps) {
		const { attachment } = nextProps;
		if (attachment) {
			const nextFilename = attachment.filename || attachment.name || 'Unnamed';
			if (nextFilename !== this.state.filename) {
				this.setState({
					filename: nextFilename,
					formattedFilename: formatFilename(nextFilename, {
						maxWidth: 90,
						fontSize: 12
					})
				});
			}
		}
	}

	render(
		{ attachment, removable, disableAction, isLocalFilePath, isUploading },
		{ formattedFilename }
	) {
		return (
			<div class={cx(s.attachment, isUploading && s.uploading)}>
				<div class={s.attachmentDetails} onClick={this.onPreview}>
					<div class={s.iconContainer}>
						<AttachmentBadge
							attachment={attachment}
							class={s.left}
							isUploading={isUploading}
							isLocalFilePath={isLocalFilePath}
						/>
					</div>
					<div class={cx(s.nameContainer)}>
						<div>{formattedFilename}</div>
						<div class={s.fileSize}>{formatBytes(attachment.size)}</div>
					</div>
				</div>
				{!isUploading &&
					!disableAction &&
					(removable ? (
						<Icon name="close" class={s.actionIcon} onClick={this.onRemove} />
					) : (
						<Icon name="download" class={s.actionIcon} onClick={this.onDownload} />
					))}
			</div>
		);
	}
}

AttachmentTile.defaultProps = {
	onRemove: () => {
		/* noop */
	}
};
