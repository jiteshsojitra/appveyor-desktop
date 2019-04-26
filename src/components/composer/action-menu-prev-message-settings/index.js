import { h } from 'preact';
import { callWith } from '../../../lib/util';
import { Text } from 'preact-i18n';
import ActionMenu, { DropDownWrapper } from '../../action-menu';
import ActionMenuGroup from '../../action-menu-group';
import ActionMenuItem from '../../action-menu-item';
import s from './style.less';
import {
	PREVIOUS_MAIL_DONT_SHOW,
	PREVIOUS_MAIL_SHOW_ORIGINAL,
	PREVIOUS_MAIL_SHOW_LAST
} from '../../../constants/composer';

export default function ActionMenuPrevMessageSettings({
	disabled,
	onSelectPreviousMessageSetting,
	previousMessageSetting,
	iconOnly,
	monotone,
	arrow,
	popoverClass
}) {
	return (
		<ActionMenu
			actionButtonClass={s.prevMailSettings}
			icon="cog"
			iconSize="xs"
			iconOnly={iconOnly}
			disabled={disabled}
			monotone={monotone}
			arrow={arrow}
			popoverClass={popoverClass}
		>
			<DropDownWrapper>
				<ActionMenuGroup>
					<ActionMenuItem
						onClick={callWith(onSelectPreviousMessageSetting, PREVIOUS_MAIL_DONT_SHOW)}
						icon={previousMessageSetting === PREVIOUS_MAIL_DONT_SHOW && 'check'}
					>
						<Text id="mail.prevMessageMenu.dontInclude" />
					</ActionMenuItem>

					<ActionMenuItem
						onClick={callWith(onSelectPreviousMessageSetting, PREVIOUS_MAIL_SHOW_ORIGINAL)}
						icon={previousMessageSetting === PREVIOUS_MAIL_SHOW_ORIGINAL && 'check'}
					>
						<Text id="mail.prevMessageMenu.includeOriginal" />
					</ActionMenuItem>

					<ActionMenuItem
						onClick={callWith(onSelectPreviousMessageSetting, PREVIOUS_MAIL_SHOW_LAST)}
						icon={previousMessageSetting === PREVIOUS_MAIL_SHOW_LAST && 'check'}
					>
						<Text id="mail.prevMessageMenu.includeLast" />
					</ActionMenuItem>
				</ActionMenuGroup>
			</DropDownWrapper>
		</ActionMenu>
	);
}
