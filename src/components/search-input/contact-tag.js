import { h } from 'preact';
import cx from 'classnames';
import { displayAddress, getAttachedImageUrl } from '../../utils/contacts';
import { compose, withProps } from 'recompose';
import { Icon } from '@zimbra/blocks';
import Avatar from '../avatar';
import s from './style.less';
import ContactHoverCard from '../contact-hover-card';
import { configure } from '../../config';
import getContext from '../../lib/get-context';
import get from 'lodash-es/get';

const ContactTag = ({ email, contact, onRemove, focused, imageURL }) => {
	const contactTagTarget = (
		<div class={cx(s.contactTag, focused && s.focused)}>
			<Avatar class={s.contactTagAvatar} email={email} profileImageURL={imageURL} />
			<div class={s.contactTagName}>{contact ? displayAddress(contact) : email}</div>
			<div onClick={onRemove}>
				<Icon name="close" class={s.close} />
			</div>
		</div>
	);
	return (
		<ContactHoverCard
			address={email}
			contact={contact}
			name={contact ? displayAddress(contact) : email}
			target={contactTagTarget}
		/>
	);
};
export default compose(
	configure('zimbraOrigin'),
	getContext(({ zimbraBatchClient }) => ({ zimbraBatchClient })),
	withProps(({ contact, zimbraOrigin, zimbraBatchClient }) => ({
		imageURL: get(contact, 'attributes')
			? getAttachedImageUrl(contact, zimbraOrigin, zimbraBatchClient)
			: ''
	}))
)(ContactTag);
