import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Text, MarkupText } from 'preact-i18n';
import { withProps } from 'recompose';
import get from 'lodash-es/get';
import find from 'lodash-es/find';
import includes from 'lodash-es/includes';
import isBefore from 'date-fns/is_before';
import { notify } from '../../store/notifications/actions';
import NakedButton from '../naked-button';
import withSearch from '../../graphql-decorators/search';
import { withCreateContact, withModifyContact } from '../../graphql-decorators/contact';
import smimeHandler from '@zimbra/electron-app/src/smime';
import { callWith } from '../../lib/util';
import { getAccountAddresses } from '../../utils/account';
import { USER_CERTIFICATE } from '../contacts/editor/fields';

import style from './style';
import withAccountInfo from '../../graphql-decorators/account-info';

@withAccountInfo(({ data: { accountInfo } }) => ({
	accAddresses: getAccountAddresses(accountInfo)
}))
@withProps(({ senders, accAddresses }) => {
	const sender = get(senders, '0'); //We need to derive sender from senders because even though there's only one sender, we get it as Array.

	// If message sender's address in included in logged in account's email addresses (primary + secondary included),
	// it means the message came from himself. In that case, we should not show any CTA to Add/Update himself to his own contact.
	const shouldShowCTA = !includes(accAddresses, sender.address);

	return {
		sender,
		shouldShowCTA
	};
})
@withSearch({
	skip: ({ shouldShowCTA }) => !shouldShowCTA,
	options: ({ sender }) => ({
		variables: {
			query: get(sender, 'address'),
			types: 'contact',
			limit: 1
		}
	}),
	props: ({ data: { search } }) => ({
		contact: get(search, 'contacts.0')
	})
})
@withCreateContact()
@withModifyContact()
@connect(
	null,
	{ notify }
)
export default class MessageSMIMEContactUpdater extends Component {
	state = {
		certOfContact: null
	};

	setCertOfContact = contact => {
		const certStr = get(contact, `attributes.${USER_CERTIFICATE}`);

		if (smimeHandler && certStr) {
			smimeHandler({
				operation: 'get-cert',
				certData: certStr
			})
				.then(({ certificate }) =>
					this.setState({
						certOfContact: certificate
					})
				)
				.catch(() =>
					this.setState({
						certOfContact: null
					})
				);
		}
	};

	isSenderFoundInContacts = () => !!this.props.contact;

	doesContactHaveCert = () => !!this.state.certOfContact;

	isContactCertOlderThanSenderCert = (certOfContact, certOfSender) =>
		isBefore(certOfContact.notBefore, certOfSender.notBefore);

	handleAddSenderToContact = certStr => {
		const {
			sender: { name, address },
			createContact,
			notify: notifyAction
		} = this.props;
		const [firstName, lastName] = (name || '').split(' ');

		const contact = {
			attributes: {
				firstName,
				lastName,
				email: address,
				[USER_CERTIFICATE]: certStr
			}
		};

		createContact(contact).then(() => {
			notifyAction({
				message: <Text id="smime.toasts.createContact" />
			});
		});
	};

	handleUpdateContactWithCert = certStr => {
		const {
			contact: {
				id,
				attributes: { [USER_CERTIFICATE]: contactCert }
			},
			modifyContact,
			notify: notifyAction
		} = this.props;

		const modifiedContact = {
			id,
			attributes: {
				[USER_CERTIFICATE]: certStr
			}
		};

		modifyContact(modifiedContact).then(() => {
			notifyAction({
				message: (
					<Text
						id={`smime.toasts.${contactCert ? 'replaceOldCertFromContact' : 'addCertToContact'}`}
					/>
				)
			});
		});
	};

	componentDidMount() {
		this.setCertOfContact(this.props.contact);
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.contact !== nextProps.contact) {
			this.setCertOfContact(nextProps.contact);
		}
	}

	render(
		{
			sender: { name, address },
			smimeData: { certchain },
			shouldShowCTA
		},
		{ certOfContact }
	) {
		const senderInfoText = name || address;
		const certOfSender = find(certchain, cert => get(cert, 'subject.email') === address);

		return (
			shouldShowCTA &&
			certOfSender && (
				<div class={style.smimeMsgContactStatusContainer}>
					{this.isSenderFoundInContacts() ? (
						this.doesContactHaveCert() ? (
							this.isContactCertOlderThanSenderCert(certOfContact, certOfSender) && (
								<div>
									<MarkupText
										id="smime.statusText.contactUpdate.senderHasOlderCert"
										fields={{ senderInfoText }}
									/>
									<NakedButton
										class={style.contactUpdateWithCertBtn}
										onClick={callWith(this.handleUpdateContactWithCert, certOfSender.base64Data)}
									>
										<Text id="smime.buttons.updateCertificateOfContact" />
									</NakedButton>
								</div>
							)
						) : (
							<div>
								<NakedButton
									class={style.contactUpdateWithCertBtn}
									onClick={callWith(this.handleUpdateContactWithCert, certOfSender.base64Data)}
								>
									<Text id="smime.buttons.addCertificateToContact" />
								</NakedButton>
							</div>
						)
					) : (
						<div>
							<MarkupText
								id="smime.statusText.contactUpdate.senderNotFoundInContact"
								fields={{ senderInfoText }}
							/>
							<NakedButton
								class={style.contactUpdateWithCertBtn}
								onClick={callWith(this.handleAddSenderToContact, certOfSender.base64Data)}
							>
								<Text id="smime.buttons.createNewContactWithCert" />
							</NakedButton>
						</div>
					)}
				</div>
			)
		);
	}
}
