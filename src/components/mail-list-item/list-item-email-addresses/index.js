import { h } from 'preact';
import { Text } from 'preact-i18n';
import style from './style';

const maxAddresses = 3;
export default function ListItemEmailAddresses({ emailAddresses }) {
	const { length } = emailAddresses;

	return (
		<span title={emailAddresses.join('\n')}>
			{length > maxAddresses
				? [
						emailAddresses.slice(0, maxAddresses - 1).join(', '),
						<span class={style.grey}>
							<Text id="mail.viewer.plusOthers" fields={{ count: length - maxAddresses + 1 }} />
						</span>
				  ]
				: emailAddresses.join(', ')}
		</span>
	);
}
