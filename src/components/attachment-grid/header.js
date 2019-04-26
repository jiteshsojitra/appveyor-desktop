/* eslint preact-i18n/no-unknown-key: ["error", { ignorePluralFormat: true }] */

import { h } from 'preact';
import NakedButton from '../naked-button';
import { Text } from 'preact-i18n';
import { callWith } from '../../lib/util';

import cx from 'classnames';
import s from './style.less';

export default function AttachmentGridHeader({
	attachments,
	isUploading,
	removable,
	onViewAll,
	onDownload,
	onDownloadAll,
	onRemoveAll
}) {
	if (attachments.length > 0) {
		if (removable) {
			return (
				<div class={cx(s.hideBelowXs, s.buttonsContainer)}>
					<div>
						<Text
							id="compose.attachment.title"
							plural={attachments.length}
							fields={{ count: attachments.length }}
						/>
					</div>
					<div class={s.buttonDivider}>
						<NakedButton onClick={onRemoveAll} class={s.button} disabled={isUploading}>
							<Text id="compose.attachment.remove" plural={attachments.length} />
						</NakedButton>
					</div>
				</div>
			);
		}
		return (
			<div class={cx(s.hideBelowXs, s.buttonsContainer)}>
				<div>
					<Text
						id="compose.attachment.title"
						plural={attachments.length}
						fields={{ count: attachments.length }}
					/>
				</div>
				<div class={s.buttonDivider}>
					<NakedButton onClick={onViewAll} class={s.button} disabled={isUploading}>
						<Text id="compose.attachment.view" plural={attachments.length} />
					</NakedButton>
				</div>
				<div class={s.buttonDivider}>
					<NakedButton
						onClick={
							attachments.length === 1 ? callWith(onDownload, attachments[0]) : onDownloadAll
						}
						class={s.button}
						disabled={isUploading}
					>
						<Text id="compose.attachment.download" plural={attachments.length} />
					</NakedButton>
				</div>
			</div>
		);
	}
}
