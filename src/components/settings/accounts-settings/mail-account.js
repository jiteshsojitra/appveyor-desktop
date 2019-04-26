import { h } from 'preact';
import { Text } from 'preact-i18n';

import { Icon } from '@zimbra/blocks';

import style from '../style';

const MailAccount = ({ name, emailAddress, failingSince, isPrimaryAccount, handleClick }) => (
	<li onClick={handleClick} class={style.mailAccountBox}>
		<div class={style.leftLogo}>
			<Icon class={style.leftLogoIcon} name="envelope" />
		</div>
		<div class={style.mailAccountContent}>
			<b class={style.mailAccountName}>{name}</b> {emailAddress}{' '}
			{isPrimaryAccount ? (
				<span class={style.mailAccountNote}>
					(<Text id="settings.accounts.types.primary" />)
				</span>
			) : (
				''
			)}
		</div>
		{failingSince && (
			<div class={style.mailAccountFailing}>
				<Icon name="warning" size="xs" class={style.warningIcon} />
			</div>
		)}
	</li>
);

export default MailAccount;
