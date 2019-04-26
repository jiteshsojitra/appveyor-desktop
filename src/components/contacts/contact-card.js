import { h, Component } from 'preact';
import format from 'date-fns/format';
import { getName, groupBy, printAddress, getAddressArray } from '../../utils/contacts';
import wire from 'wiretie';
import { getId, base64ToBlob } from '../../lib/util';
import { PhotoUpload } from './photo-upload';
import style from './style';
import cx from 'classnames';
import { Text, MarkupText } from 'preact-i18n';
import { Label, Icon } from '@zimbra/blocks';
import smimeHandler from '@zimbra/electron-app/src/smime';
import get from 'lodash-es/get';
import { USER_CERTIFICATE } from './editor/fields';
import withAccountInfo from '../../graphql-decorators/account-info';
import { withModifyContact } from '../../graphql-decorators/contact';
import { isSMIMEFeatureAvailable } from '../../utils/license';
import { CONTACT_GROUP_PREFIX } from '../../constants/contacts';
import CertificateModal from './../smime-and-encryption/certificate-modal/index';
import escape from 'lodash-es/escape';

@withAccountInfo(({ data: { accountInfo } }) => ({
	isSMimeEnabled: isSMIMEFeatureAvailable(accountInfo.license)
}))
@withModifyContact()
@wire('zimbra', {}, zimbra => ({
	attach: zimbra.attachment.upload
}))
export default class ContactCard extends Component {
	state = {
		publicCert: null,
		showCertDetails: false
	};

	handleOpenCertificateDialog = () => {
		this.setState({
			showCertDetails: true
		});
	};

	handleCloseCertificateDialog = () => {
		this.setState({
			showCertDetails: false
		});
	};

	onClickGroup = () => {
		this.props.onClose();
		return true;
	};

	saveImage = imageData =>
		base64ToBlob(imageData) // Convert base64 data to blob
			.then(blob => {
				const { modifyContact, onSave, attach } = this.props;

				// Upload contact profile image
				attach(blob, {
					filename: 'default.' + imageData.slice(imageData.indexOf('/') + 1, imageData.indexOf(';'))
				}).then(aid => {
					const changes = { image: aid };

					modifyContact({
						id: getId(this.props.contact),
						attributes: changes
					}).then(onSave);
				});
			});

	setContactPublicCert = contactPublicCertStr => {
		if (this.props.isSMimeEnabled) {
			if (smimeHandler && contactPublicCertStr) {
				smimeHandler({
					operation: 'get-cert',
					certData: contactPublicCertStr
				})
					.then(({ certificate, isExpired }) => {
						this.setState({
							publicCert: {
								...certificate,
								isCertificateExpired: isExpired
							}
						});
					})
					.catch(() => {
						this.setState({ publicCert: null });
					});
			} else {
				this.setState({ publicCert: null });
			}
		}
	};

	componentDidMount() {
		this.setContactPublicCert(get(this.props, `contact.attributes.${USER_CERTIFICATE}`));
	}

	componentWillReceiveProps(nextProps) {
		const contactPublicCert = get(this.props, `contact.attributes.${USER_CERTIFICATE}`),
			nextContactPublicCert = get(nextProps, `contact.attributes.${USER_CERTIFICATE}`);

		if (contactPublicCert !== nextContactPublicCert) {
			this.setContactPublicCert(nextContactPublicCert);
		}
	}

	componentWillUnmount() {
		this.setState({
			showCertDetails: false
		});
	}

	renderGroups() {
		const { contact, contactGroups } = this.props;
		const memberOfLists = (get(contact, 'memberOf') || '').split(',').filter(Boolean);
		const groups = contactGroups.filter(({ id: groupId }) => memberOfLists.indexOf(groupId) > -1);

		return groups.length ? (
			<div class={style.item}>
				{groups.map(group => (
					<Label onClick={this.onClickGroup} href={`/contacts/${CONTACT_GROUP_PREFIX}${group.id}`}>
						{group.attributes.nickname}
					</Label>
				))}
			</div>
		) : null;
	}

	render(
		{ contact, isSMimeEnabled, isTrashFolder, isSingleSelectAndDeleted, isGalContact },
		{ publicCert, showCertDetails }
	) {
		const attrs = (contact && contact.attributes) || {},
			isNew = contact && !contact.id,
			{ fullName, ...restAttrs } = attrs;

		const contactName = getName(restAttrs);
		// Deleted contact can appear in contact lists, so have different styling for them
		const isContactDeleted = !isTrashFolder && isSingleSelectAndDeleted;

		return (
			<div class={style.card}>
				<div class={style.cardHeader}>
					<div class={style.avatar}>
						<PhotoUpload contact={contact} allowUpload={!isGalContact} saveImage={this.saveImage} />
					</div>
				</div>
				<div class={style.cardBody}>
					<h2 class={style.name}>
						{isContactDeleted && (
							<MarkupText
								id="contacts.list.deleted"
								fields={{
									contactNameMarkup: `<span class=${style.trashedContact}>${escape(
										contactName
									)}</span>`,
									deletedClass: style.deleted
								}}
							/>
						)}
						{!isContactDeleted && (
							<span>{contactName || (isNew && <Text id="contacts.edit.fields.newContact" />)}</span>
						)}
						{attrs.nickname && <span class={cx(style.type, style.nickname)}>{attrs.nickname}</span>}
					</h2>
					<div>
						{attrs.jobTitle && (
							<div class={style.item}>
								<div class={style.type}>
									<Text id="contacts.edit.fields.jobTitle" />
								</div>
								<div class={style.item}>
									{attrs.company ? (
										<Text
											id="contacts.edit.fields.atPlaceholder"
											fields={{ jobTitle: attrs.jobTitle, company: attrs.company }}
										/>
									) : (
										attrs.jobTitle
									)}
								</div>
							</div>
						)}

						{isSMimeEnabled && publicCert && (
							<div class={style.item}>
								<div class={style.type}>
									<Text id="contacts.edit.details.secureCert" />
								</div>
								<div class={style.item}>
									<label class={cx(publicCert.isCertificateExpired && style.expiredCertLabel)}>
										<Icon size="sm" name="verified" class={style.smimePubCertShieldIcon} />
										<span>
											<Text
												id={`smime.certificate.${
													publicCert.isCertificateExpired ? 'expiredText' : 'verifiedText'
												}`}
											/>
										</span>
									</label>
									<span class={style.viewCert} onClick={this.handleOpenCertificateDialog}>
										<Text id="smime.viewCert" />
									</span>
								</div>
							</div>
						)}
						{showCertDetails && (
							<CertificateModal cert={publicCert} onClose={this.handleCloseCertificateDialog} />
						)}

						{attrs.company && !attrs.jobTitle && (
							<div class={style.item}>
								<div class={style.type}>
									<Text id="contacts.edit.fields.company" />
								</div>
								<div class={style.item}>{attrs.company}</div>
							</div>
						)}

						{['email', 'workEmail', 'homeEmail'].map(key =>
							groupBy(attrs, key).map(
								value =>
									value && (
										<div class={style.item}>
											<div class={style.type}>
												<Text id={`contacts.edit.dropdown.email.${key}`} />
											</div>
											<a href={`mailto:${value}`}>{value}</a>
										</div>
									)
							)
						)}

						{['phone', 'mobile', 'homePhone', 'workPhone', 'fax', 'pager'].map(key =>
							groupBy(attrs, key).map(
								value =>
									value && (
										<div class={style.item}>
											<div class={style.type}>
												<Text id={`contacts.edit.dropdown.phone.${key}`} />
											</div>
											<a href={`tel: ${value}`}>{value}</a>
										</div>
									)
							)
						)}

						{groupBy(attrs, 'im').map(
							value =>
								value && (
									<div class={style.item}>
										<div class={style.type}>
											<Text id={`contacts.edit.dropdown.chat`} />
										</div>
										<div>{value}</div>
									</div>
								)
						)}
					</div>

					{getAddressArray(contact).map(address => (
						<div class={style.addressInfo}>
							<div class={style.type}>
								<Text id={`contacts.edit.dropdown.${address.type}`} />
							</div>
							<div class={style.item}>{printAddress(address)}</div>
						</div>
					))}

					<div class={style.secondaryContactInfo}>
						{['birthday', 'anniversary'].map(key =>
							groupBy(attrs, key).map(
								value =>
									value && (
										<div class={style.item}>
											<div class={style.type}>
												<Text id={`contacts.edit.dropdown.${key}`} />
											</div>
											<DateDisplay date={value} />
										</div>
									)
							)
						)}

						{attrs.website && (
							<div class={style.item}>
								<div class={style.type}>
									<Text id={`contacts.edit.dropdown.website`} />
								</div>
								<a href={attrs.website} target="_blank" rel="noopener noreferrer">
									{attrs.website}
								</a>
							</div>
						)}

						{attrs.notes && (
							<div class={style.item}>
								<div class={style.type}>
									<Text id="contacts.edit.fields.notes" />
								</div>
								<div class={style.notes}>{attrs.notes}</div>
							</div>
						)}

						{this.renderGroups()}
					</div>
				</div>
			</div>
		);
	}
}

function DateDisplay({ date }) {
	const parsed = new Date(date.replace(/-/g, '/'));
	return <time datetime={date}>{format(parsed, 'MMMM D, YYYY')}</time>;
}
