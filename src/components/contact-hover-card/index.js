import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import { withText, Text } from 'preact-i18n';
import { configure } from '../../config';
import { Icon, Popover } from '@zimbra/blocks';
import ZimletSlot from '../zimlet-slot';
import ContactCardMenu from '../contact-card-menu';
import Avatar from '../avatar';
import withSearch from '../../graphql-decorators/search';
import withSearchGal from '../../graphql-decorators/search/search-gal';
import { CONTACTS } from '../../constants/folders';
import {
	getPrimaryPhone,
	getPrimaryEmail,
	getJobDescription,
	getName,
	getAttachedImageUrl
} from '../../utils/contacts';
import { isPossiblySpoofedAddress } from '../../utils/phishing';
import cx from 'classnames';
import style from './style';
import get from 'lodash-es/get';
import getContext from '../../lib/get-context';
import { withProps } from 'recompose';

const SHOW_EVENT_DETAILS_AFTER_HOVER_DELAY = 1000;

@withText('mail.viewer.spoofedAddressWarning')
@configure('routes.slugs,zimbraOrigin')
/* `withSearchGal`: Get thumbnail image explicitly using searchGal request.
 *  @TODO: isGalContact should have appropriate value when selecting contact from autoComplete.
 *  Currently its working for contact-chooser.
 */
@withSearchGal({
	skip: ({ contact }) => contact && contact.isGalContact === false,
	options: ({ address }) => ({
		variables: {
			name: address.address || address.email || address,
			types: 'contact',
			limit: 1
		}
	}),
	props: ({ data: { searchGal } }) => ({
		thumbnailPhoto: get(searchGal, 'contacts.0.attributes.thumbnailPhoto')
	})
})
@getContext(({ zimbraBatchClient }) => ({ zimbraBatchClient }))
@withSearch({
	skip: ({ contact, address }) => !contact && !address,
	options: ({ address }) => ({
		variables: {
			query: `in:"${CONTACTS}", contact:${address}`,
			types: 'contact',
			limit: 1
		}
	}),
	props: ({ data: { search } }) => ({
		contactAlreadyExists: !!get(search, 'contacts')
	})
})
/**
 *  Append thumbnail photo with the contact and pass it as contactDetails prop
 *  and use contactDetails further instead of contact.
 */
@withProps(({ contact, thumbnailPhoto, zimbraOrigin, zimbraBatchClient }) => ({
	contactDetails: { ...contact, thumbnailPhoto },
	imageURL: get(contact, 'attributes')
		? getAttachedImageUrl(contact, zimbraOrigin, zimbraBatchClient)
		: ''
}))
export default class ContactHoverCard extends PureComponent {
	getInfo() {
		// TODO: Remove support for "address" and use contact only.
		const { contactAlreadyExists, address, name, contactDetails = {} } = this.props;

		const attributes = contactDetails.attributes ||
			contactDetails._attrs || {
				email: address,
				name: name || address.split('@')[0]
			};

		return {
			contactAlreadyExists,
			contactDetails,
			isSpoofed: isPossiblySpoofedAddress(attributes),
			name: name || getName(attributes),
			email: getPrimaryEmail({ attributes }),
			jobDescription: getJobDescription(attributes),
			phone: getPrimaryPhone({ attributes })
		};
	}

	render({
		slugs,
		toggleActionMenu,
		toggleEditModal,
		target,
		spoofedAddressWarning,
		invalidCert,
		verifiedStatusText,
		imageURL
	}) {
		const {
			contactDetails,
			contactAlreadyExists,
			isSpoofed,
			name,
			email,
			jobDescription,
			phone
		} = this.getInfo();
		const { publicCert, isCertificateExpired } = contactDetails;

		return (
			<Popover
				arrow
				placement="top"
				anchor="center"
				hoverDuration={SHOW_EVENT_DETAILS_AFTER_HOVER_DELAY}
				onToggle={this.handleToggle}
				target={target}
			>
				<div class={style.contactCard}>
					<div class={style.details}>
						<h3>
							{isSpoofed && <Icon size="sm" name="warning" title={spoofedAddressWarning} />}
							{name}
						</h3>
						<h4>{jobDescription}</h4>
						<dl class={style.cardInfo}>
							<dt>
								<Icon name="envelope" size="sm" />
							</dt>
							<dd>
								<a href={'mailto:' + email}>{email}</a>
							</dd>
						</dl>
						{phone && (
							<dl class={style.cardInfo}>
								<dt>
									<Icon name="mobile-phone" size="sm" />
								</dt>
								<dd>
									<a href={'tel:' + phone}>{phone}</a>
								</dd>
							</dl>
						)}
						<dl class={style.cardInfo}>
							<dt>
								<Icon name="search" size="sm" />
							</dt>
							<dd>
								<a
									href={`/search/${slugs.email}?q=${encodeURIComponent(
										`to:${email} OR from:${email}`
									)}`}
								>
									<Text id="contacts.hoverCard.searchEmails" />
								</a>
							</dd>
						</dl>
						<ZimletSlot name="contact-hover-card-details" email={email} />
					</div>

					<div class={style.avatarWrapper}>
						<Avatar
							class={style.avatar}
							email={email}
							contact={contactDetails}
							profileImageURL={imageURL}
						/>
					</div>

					<footer class={style.footer}>
						<ContactCardMenu
							contact={contactDetails}
							email={email}
							jobDescription={jobDescription}
							name={name}
							phone={phone}
							toggleActionMenu={toggleActionMenu}
							toggleEditModal={toggleEditModal}
							enableEdit={contactAlreadyExists}
						/>
						{publicCert && typeof isCertificateExpired === 'boolean' && (
							<div class={cx(invalidCert ? style.sMimePubCertExpired : style.sMimePubCertVerified)}>
								<Icon class={style.smimePubCertShieldIcon} name="verified" size="sm" />
								<Text id={`smime.certificate.${verifiedStatusText}`} />
							</div>
						)}
					</footer>
				</div>
			</Popover>
		);
	}
}
