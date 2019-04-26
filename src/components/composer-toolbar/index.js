import { h } from 'preact';

import Toolbar from '../toolbar';
import ToolbarSVGActionButton from '../toolbar/svg-action-button';
import { SendButton } from '../../components/gui-rich-text-area/components/toolbar/buttons';
import { ReadReceiptsDropDown } from '../composer/read-receipts-dropdown';

import s from './style.less';

export default function ComposerToolbar({
	onSend,
	onClose,
	disabled,
	loading,
	requestReadReceipt,
	updateReadReceipt
}) {
	return (
		<Toolbar>
			<ToolbarSVGActionButton onClick={onClose} iconClass="close" />
			<div class={s.sendButtonContainer}>
				<SendButton onClick={onSend} disabled={disabled} loading={loading} />
			</div>
			<div class={s.readReceiptButtonContainer}>
				<ReadReceiptsDropDown
					requestReadReceipt={requestReadReceipt}
					updateReadReceipt={updateReadReceipt}
				/>
			</div>
		</Toolbar>
	);
}
