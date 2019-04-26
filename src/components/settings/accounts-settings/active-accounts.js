import { h } from 'preact';
import cx from 'classnames';
import { Text } from 'preact-i18n';

import AccountsList from './accounts-list';

import style from '../style';

const ActiveAccountsView = ({ accounts, switchActiveScreen }) => (
	<div class={cx(style.subsectionBody, style.accountSubsection)}>
		<div class={style.sectionTitle}>
			<Text id="settings.accounts.mailAddressesTitle" />
		</div>
		<AccountsList switchActiveScreen={switchActiveScreen} accounts={accounts} />
	</div>
);

export default ActiveAccountsView;
