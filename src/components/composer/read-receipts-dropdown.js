import { h } from 'preact';
import { Text } from 'preact-i18n';

import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import { Icon } from '@zimbra/blocks';
import { callWith } from '../../lib/util';

import style from './style';

const actionMenuBtn = () => (
	<span class={style.selectedOperation}>
		<Icon name="ellipsis-h" size="lg" />
	</span>
);

export const ReadReceiptsDropDown = ({ requestReadReceipt, updateReadReceipt }) => (
	<ActionMenu
		label={actionMenuBtn()}
		arrow={false}
		actionButtonClass={style.requestReadReceiptOpBtn}
	>
		<DropDownWrapper>
			<ActionMenuGroup>
				<ActionMenuItem
					onClick={callWith(updateReadReceipt, !requestReadReceipt)}
					icon={requestReadReceipt ? 'check' : null}
				>
					<Text id="requestReadReceipt.writeEmailMenuTitle" />
				</ActionMenuItem>
			</ActionMenuGroup>
		</DropDownWrapper>
	</ActionMenu>
);
