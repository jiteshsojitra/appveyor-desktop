import { h } from 'preact';
import TogglePreviousMail from './toggle-previous-mail';
import ActionMenuPrevMessageSettings from '../composer/action-menu-prev-message-settings';
import s from './style.less';

export default function MailResponseControls({
	onSelectPreviousMessageSetting,
	previousMessageSetting,
	onTogglePreviousMail,
	expandPrevMail
}) {
	return (
		<div class={s.mailResponseControls}>
			{!expandPrevMail && (
				<TogglePreviousMail
					onTogglePreviousMail={onTogglePreviousMail}
					expandPrevMail={expandPrevMail}
				/>
			)}

			<ActionMenuPrevMessageSettings
				onSelectPreviousMessageSetting={onSelectPreviousMessageSetting}
				previousMessageSetting={previousMessageSetting}
				iconOnly
				arrow={false}
				monotone
			/>
		</div>
	);
}
