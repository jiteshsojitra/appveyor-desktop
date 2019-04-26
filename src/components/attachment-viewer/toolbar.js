import { h, Component } from 'preact';
import { Button, Icon } from '@zimbra/blocks';
import { withText } from 'preact-i18n';
import { AriaSpeak } from '@zimbra/a11y';

import cx from 'classnames';
import style from './style';

@withText({
	downloadLabel: 'buttons.download',
	fullScreenLabel: 'buttons.fullScreen',
	closeLabel: 'buttons.close'
})
export default class AttachmentViewerToolbar extends Component {
	render({
		attachment,
		page,
		maxPages,
		onDownload,
		onFullScreen,
		onClose,
		downloadLabel,
		fullScreen,
		fullScreenLabel,
		closeLabel
	}) {
		return (
			<div class={style.toolbar}>
				{attachment && (attachment.filename || attachment.name) && (
					<AriaSpeak message={attachment.filename || attachment.name} />
				)}
				<h2 class={style.title}>
					{attachment && (attachment.filename || attachment.name)}
					{typeof page !== 'undefined' && (
						<span class={style.pages}>
							<span>{page}</span> / {maxPages}
						</span>
					)}
				</h2>
				<div class={style.attachmentActions}>
					<Button
						aria-label={downloadLabel}
						title={downloadLabel}
						class={style.actionButton}
						onClick={onDownload}
					>
						<Icon name="download" />
					</Button>
					{!fullScreen && (
						<Button
							aria-label={fullScreenLabel}
							title={fullScreenLabel}
							class={cx(style.hideSmDown, style.actionButton)}
							onClick={onFullScreen}
						>
							<Icon name="expand" />
						</Button>
					)}
					<Button
						aria-label={closeLabel}
						title={closeLabel}
						class={style.actionButton}
						onClick={onClose}
					>
						<Icon name="close" />
					</Button>
				</div>
			</div>
		);
	}
}
