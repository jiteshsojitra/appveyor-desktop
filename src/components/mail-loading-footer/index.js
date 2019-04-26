import { h } from 'preact';
import { Text } from 'preact-i18n';
import MailListFooter from '../mail-list-footer';

export default function MailLoadingFooter(props) {
	return (
		<MailListFooter {...props}>
			<Text id="app.loading" />
		</MailListFooter>
	);
}
