import { h, Component } from 'preact';
import { Button, Icon } from '@zimbra/blocks';
import { withPropsOnChange } from 'recompose';
import cx from 'classnames';
import { parseAddress, isValidEmail, getEmail } from '../../lib/util';
import { addressFromContact, displayAddress } from '../../utils/contacts';
import Suggestions from './suggestions';
import TokenInput from '../token-input';
import ContactPicker from '../contact-picker';
import ContactHoverCard from '../contact-hover-card';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import style from './style';
import { getSMimePublicCerts } from '../../graphql-decorators/smime/public-certs';
import smimeHandler from '@zimbra/electron-app/src/smime';
import isString from 'lodash/isString';

const RIGHT_MOUSE_BUTTON = 2;

function createAddress(address) {
	if (typeof address === 'object') {
		return address.email && addressFromContact(address);
	}

	return parseAddress(address);
}

function defaultValidateTokenFn(address, token) {
	return isValidEmail(getEmail(token.address));
}

export default class AddressField extends Component {
	openPicker = () => {
		this.setState({ openPicker: true });
	};

	closePicker = () => {
		this.setState({ openPicker: false });
	};

	setContacts = contacts => {
		this.props.onChange({
			value: contacts.map(
				c =>
					this.props.value.find(v => {
						const attrs = c.attributes || c._attrs || c;
						return attrs.email === v.address && attrs.fullName === v.name;
					}) || addressFromContact(c)
			)
		});
	};

	filterDuplicateAddresses = arr => {
		let hasDupes = false;
		const found = [],
			out = [];
		const { isLocation } = this.props;

		for (let i = 0; i < arr.length; i++) {
			const addr = arr[i];
			const stringToCheck = isLocation && isString(addr) ? addr : addr.address;

			if (found.indexOf(stringToCheck) === -1) {
				found.push(stringToCheck);
				out.push(addr);
			} else {
				hasDupes = true;
			}
		}

		return hasDupes ? out : arr;
	};

	handleContactDataChange = contact => {
		const value = cloneDeep(this.props.value);

		const match = value.find(v => v.address === contact.address && v.name === contact.name);

		if (match && typeof this.props.onCertDataChange === 'function') {
			match.publicCertObject = contact.publicCertObject;
			match.isCertificateExpired = contact.isCertificateExpired;
			match.publicCert = contact.publicCert;

			this.props.onCertDataChange({
				value
			});
		}
	};

	render(
		{
			label,
			value,
			formSize,
			wasPreviouslySelected,
			previouslySelectedLabel,
			class: c,
			tokenInputClass,
			tokenInputStyle,
			validateToken,
			showCertBadge = false,
			...props
		},
		{ openPicker }
	) {
		return (
			<div class={cx(style.addressField, c)}>
				{label && (
					<Button styleType="text" class={style.label} onClick={this.openPicker}>
						{label}
					</Button>
				)}

				<TokenInput
					value={this.filterDuplicateAddresses(value)}
					class={cx(style.input, formSize && style.formSize, tokenInputClass)}
					{...props}
					inputClassName={style.inputField}
					createValue={createAddress}
					renderValue={displayAddress}
					renderToken={renderToken}
					tokenInputStyle={tokenInputStyle}
					renderAutoSuggest={Suggestions}
					wasPreviouslySelected={wasPreviouslySelected}
					validateToken={
						typeof validateToken === 'function' ? validateToken : defaultValidateTokenFn
					}
					previouslySelectedLabel={previouslySelectedLabel}
					onDataChange={this.handleContactDataChange}
					showCertBadge={showCertBadge}
				/>

				{openPicker && (
					<ContactPicker
						contacts={this.filterDuplicateAddresses(value)}
						onSave={this.setContacts}
						onClose={this.closePicker}
					/>
				)}
			</div>
		);
	}
}

const renderToken = ({ token, ...props }) => <ContactInputToken contact={token} {...props} />;
@withPropsOnChange(
	['contact'],
	({ contact: { isCertificateExpired, publicCertObject, address } }) => ({
		invalidCert:
			isCertificateExpired ||
			(publicCertObject && address !== get(publicCertObject, 'subject.email')),
		publicCertObject,
		verifiedStatusText:
			publicCertObject &&
			((isCertificateExpired && 'expiredText') ||
				(address !== get(publicCertObject, 'subject.email') && 'emailMismatchText') ||
				'verifiedText')
	})
)
@getSMimePublicCerts()
class ContactInputToken extends Component {
	handleMouseDown = e => {
		if (e.button === RIGHT_MOUSE_BUTTON) {
			setTimeout(this.openDetails, 0);
			return this.prevent(e);
		}
	};

	prevent = e => {
		e.preventDefault();
		e.stopPropagation();
		return false;
	};

	parseSmimeCert = ({ publicCert, onDataChange, contact }) => {
		if (smimeHandler) {
			if (publicCert) {
				smimeHandler({
					operation: 'get-cert',
					certData: publicCert
				})
					.then(({ certificate, isExpired }) => {
						onDataChange &&
							onDataChange({
								...contact,
								publicCert,
								publicCertObject: certificate,
								isCertificateExpired: isExpired
							});
					})
					.catch(err => console.error(err));
			} else {
				onDataChange &&
					onDataChange({
						...contact,
						publicCert: null,
						publicCertObject: null,
						isCertificateExpired: false
					});
			}
		}
	};

	componentDidMount() {
		this.parseSmimeCert(this.props);
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.publicCert !== nextProps.publicCert) {
			this.parseSmimeCert(nextProps);
		}
	}

	render(
		{
			contact,
			selected,
			select,
			activated,
			invalid,
			invalidCert,
			publicCertObject,
			verifiedStatusText
		},
		{ hover, details }
	) {
		const name = contact.name || contact.shortName || displayAddress(contact),
			active = hover || details || activated;

		const recipient = (
			<span
				class={cx(
					style.token,
					selected && style.selected,
					active && style.active,
					invalid && style.invalid
				)}
			>
				<div class={style.tokenLabel}>
					{publicCertObject && (
						<Icon
							size="sm"
							class={cx(style.smimePubCertShieldIcon, invalidCert && style.expiredCert)}
							name="verified"
						/>
					)}
					<button onClick={select} onMouseDown={this.handleMouseDown} onContextMenu={this.prevent}>
						{name}
					</button>
				</div>
			</span>
		);

		return !invalid ? (
			<ContactHoverCard
				address={contact.address || contact.email}
				contact={contact}
				name={name}
				visible={hover}
				onDismiss={this.closeDetails}
				target={recipient}
				invalidCert={invalidCert}
				verifiedStatusText={verifiedStatusText}
			/>
		) : (
			recipient
		);
	}
}
