import { h } from 'preact';

import { Text } from 'preact-i18n';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';

import s from './style.less';
import cx from 'classnames';

export default function ActionMenuSettings({
	onClickSettings,
	onClickAbout,
	onClickLanguage,
	popoverClass,
	actionButtonClass,
	iconClass

	/**
	 * onClickEmailSupport,
	 * etc...
	 */
}) {
	return (
		<ActionMenu
			icon="cog"
			actionButtonClass={actionButtonClass}
			popoverClass={cx(s.popover, popoverClass)}
			iconSize="md"
			iconClass={iconClass}
			iconOnly
			arrow={false}
			anchor="end"
		>
			<DropDownWrapper>
				<ActionMenuGroup>
					<ActionMenuItem className={s.item} onClick={onClickSettings} icon="cog">
						<Text id="header.SETTINGS" />
					</ActionMenuItem>
					<ActionMenuItem className={s.item} onClick={onClickLanguage} icon="language">
						<Text id="header.LANGUAGE" />
					</ActionMenuItem>
				</ActionMenuGroup>
				<ActionMenuGroup>
					<ActionMenuItem className={s.item} onClick={onClickAbout} icon="about">
						<Text id="header.ABOUT" />
					</ActionMenuItem>
				</ActionMenuGroup>
			</DropDownWrapper>
		</ActionMenu>
	);
}
