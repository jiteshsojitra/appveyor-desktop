import { h } from 'preact';
import cx from 'classnames';
import { Button, Icon } from '@zimbra/blocks';
import AttachmentBadge from '../attachment-badge';
import SentTimeFormat from '../sent-time-format';

import style from './style';
import { formatBytes, callWith } from '../../lib/util';

const DocumentAttachment = ({
	item: {
		attachment,
		attachment: { filename, size },
		message: { date, subject, conversationId }
	},
	onDownload,
	onEmail,
	onTogglePreviewer,
	allAttachments
}) => (
	<div
		class={cx(style.documentAttachment)}
		onClick={callWith(onTogglePreviewer, { attachment, allAttachments })}
	>
		<AttachmentBadge attachment={attachment} class={style.left} />
		<div class={style.right}>
			<div class={style.mainInfo}>
				<div class={style.filename}>{filename}</div>
				<div class={style.size}>{formatBytes(size)}</div>
			</div>
			<div class={style.middle}>
				{subject && <div class={style.sender}>{subject}</div>}
				{date && (
					<div class={style.sentTime}>
						<SentTimeFormat date={date} />
					</div>
				)}
			</div>
			<div class={style.rightSide}>
				<Button onClick={callWith(onDownload, attachment)()}>
					<Icon name="download" size="md" />
				</Button>
				<Button onClick={callWith(onEmail, conversationId)()}>
					<Icon name="envelope" size="md" />
				</Button>
			</div>
		</div>
	</div>
);

export default DocumentAttachment;
