import { h } from 'preact';
import { Button, Icon } from '@zimbra/blocks';
import SentTimeFormat from '../sent-time-format';
import LazyLoadedImage from '../lazy-loaded-image';
import style from './style';
import { formatBytes, callWith } from '../../lib/util';

const PictureAttachment = ({
	item: {
		attachment,
		attachment: { url, filename, size },
		message: { date, conversationId }
	},
	onDownload,
	onEmail,
	onTogglePreviewer,
	allAttachments,
	imageIndex
}) => (
	<div
		class={style.pictureAttachment}
		onClick={callWith(onTogglePreviewer, { attachment, allAttachments })}
	>
		<LazyLoadedImage imageIndex={imageIndex} url={url} />
		<div class={style.mainInfo}>
			<div class={style.filename}>{filename}</div>
			<div class={style.subInfoContainer}>
				<div class={style.leftSide}>
					<div class={style.size}>{formatBytes(size)}</div>
					{date && (
						<div class={style.sentTime}>
							<SentTimeFormat date={date} />
						</div>
					)}
				</div>
				<div class={style.rightSide}>
					<Button onClick={callWith(onDownload, attachment)()}>
						<Icon name="download" size="sm" />
					</Button>
					<Button onClick={callWith(onEmail, conversationId)()}>
						<Icon name="envelope" size="sm" />
					</Button>
				</div>
			</div>
		</div>
	</div>
);

export default PictureAttachment;
