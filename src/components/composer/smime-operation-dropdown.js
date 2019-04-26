import { h } from 'preact';
import { Text } from 'preact-i18n';

import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import cloneDeep from 'lodash/cloneDeep';
import style from './style';
import { callWith } from '../../lib/util';
import { Icon } from '@zimbra/blocks';
import { SMIME_OPERATIONS, SMIME_ICONS } from '../../constants/smime';

const operations = cloneDeep(SMIME_OPERATIONS);
delete operations.rememberSettings;

const selectedValue = operation => (
	<span class={style.selectedOperation}>
		<Icon name={SMIME_ICONS[operation]} class={style.shieldIcon} size="sm" />
		<Text id={`settings.smimeAndEncryption.defaultSettings.options.${operation}`} />
	</span>
);

export const SMIMEOperationDropDown = ({ smimeOperation, changeSmimeOperation }) => (
	<ActionMenu
		label={selectedValue(smimeOperation)}
		anchor="end"
		actionButtonClass={style.smimeOperationBtn}
	>
		<DropDownWrapper>
			<ActionMenuGroup>
				{Object.keys(operations).map(operation => (
					<ActionMenuItem
						icon={SMIME_ICONS[operation]}
						onClick={callWith(changeSmimeOperation, operation)}
					>
						<Text id={`settings.smimeAndEncryption.defaultSettings.options.${operation}`} />
					</ActionMenuItem>
				))}
			</ActionMenuGroup>
		</DropDownWrapper>
	</ActionMenu>
);
