import { h } from 'preact';
import { Text } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';
import MailAccount from './mail-account';
import style from '../style';
import { callWith } from '../../../lib/util';

const AccountsList = ({ accounts, switchActiveScreen }) => (
	<div>
		<ul class={style.accountsList}>
			{accounts.map(account => (
				<MailAccount
					{...account}
					handleClick={callWith(switchActiveScreen, ['edit', account.id])}
				/>
			))}
		</ul>
		<button class={style.addMailboxButton} onClick={callWith(switchActiveScreen, ['add'])}>
			<Icon class={style.addIcon} name="plus" size="sm" />
			<Text id="settings.accounts.addAccount.addAnotherAccountLabel" />
		</button>
	</div>
);

export default AccountsList;
