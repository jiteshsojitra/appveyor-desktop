import { h } from 'preact';
import { Text } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';

import style from './style.less';
import { SMIME_EMAIL_STATUS } from '../../constants/smime';
import cx from 'classnames';

export default function MessageSMIMEStatus({
	smimeData: { status = SMIME_EMAIL_STATUS.encryptOnly, emails, certchain },
	isSigned,
	isEncrypted,
	onViewCertificate
}) {
	const emailString = emails && emails.join(', '),
		isSignedProperly = status === SMIME_EMAIL_STATUS.signed;

	const signAndEncStatus = (
		<Text
			id={`smime.emailOperation${emailString ? 'With' : 'Without'}Email.${
				isEncrypted
					? isSignedProperly || certchain
						? 'signedAndEnc'
						: 'encrypted' // In case of `Outlook`s Sign & Encr msg, we can't verify msg due to missign Signature Hash, so `status` will be `untrusted`. So, we decide that if `certs` are present, its Sign+Encr msg.
					: isSigned
					? 'signed'
					: ''
			}`}
			fields={emailString && { name: emailString }}
		/>
	);

	return (
		<div class={!isSignedProperly && style.smimeStatusError}>
			<div>
				<Icon
					name={isSignedProperly ? 'verified' : 'not-verified'}
					class={cx(style.verifiedIcon, !isSignedProperly && style.shieldIcon)}
					size="sm"
				/>
				<span class={style.smimeStatusMsg}>{signAndEncStatus}</span>
				{certchain && !!certchain.length && (
					<span class={style.smimeStatusMsg}>
						<Text id="settings.accountRecovery.pipe" />
						<span class={style.anchorLink} onClick={onViewCertificate}>
							<Text id="smime.viewCert" />
						</span>
					</span>
				)}
			</div>
			{!isSignedProperly && (
				<div class={style.smimeStatusText}>
					<Text id={`smime.emailStatus.${status}`} fields={emailString && { name: emailString }} />
				</div>
			)}
		</div>
	);
}
