import { h } from 'preact';
import { Icon } from '@zimbra/blocks';
import { memoize } from 'decko';
import md5 from 'tiny-js-md5';
import { getEmail } from '../../lib/util';
import { getName } from '../../utils/contacts';
import get from 'lodash-es/get';
import cx from 'classnames';
import style from './style';

const getAvatar = memoize(
	email => `https://www.gravatar.com/avatar/${md5(email.toLowerCase())}?s=200&d=blank`
);

export default function Avatar({
	profileImageURL,
	showInitials = false,
	email,
	contact: { attributes = {}, _attrs = {}, zimbraCalResType, thumbnailPhoto, isGroup } = {},
	mode,
	...props
}) {
	const attrs = attributes || _attrs;
	const name = getName(attrs) || '';
	const initials = (name.match(/\b[A-Z]/g) || []).join('');

	const emailAddress = getEmail(email || attrs.email);
	const thumbnailBase64 = get(attrs, 'thumbnailPhoto') || thumbnailPhoto;

	return (
		<div {...props} class={cx(style.avatar, mode === 'contain' && style.contain, props.class)}>
			{showInitials && initials ? (
				<span class={style.initials}>{initials}</span>
			) : (
				<Icon
					name={zimbraCalResType === 'Location' ? 'location' : isGroup ? 'users' : 'user'}
					class={style.default}
				/>
			)}
			{profileImageURL ? (
				<div class={style.inner} style={{ backgroundImage: `url(${profileImageURL})` }} />
			) : thumbnailBase64 ? (
				<div
					class={style.inner}
					style={{ backgroundImage: `url(${`data:;base64,` + thumbnailBase64})` }}
				/>
			) : (
				<div
					class={style.inner}
					style={emailAddress && { backgroundImage: `url(${getAvatar(emailAddress)})` }}
				/>
			)}
		</div>
	);
}
