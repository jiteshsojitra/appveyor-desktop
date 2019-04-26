import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import each from 'lodash-es/each';
import get from 'lodash-es/get';
import { memoize } from 'decko';
import { Button, Select, Option } from '@zimbra/blocks';
import ContactCard from '../contact-card';
import smimeHandler from '@zimbra/electron-app/src/smime';
import cx from 'classnames';
import { connect } from 'preact-redux';
import format from 'date-fns/format';
import {
	getId,
	filterDuplicates,
	deepClone,
	isValidEmail,
	replaceAttributes,
	base64ToBlob
} from '../../../lib/util';
import { isSMIMEFeatureAvailable } from '../../../utils/license';
import style from '../style';
import isEqual from 'lodash/isEqual';
import withAccountInfo from '../../../graphql-decorators/account-info';
import { withCreateContact, withModifyContact } from '../../../graphql-decorators/contact';
import withGetContactFolders from '../../../graphql-decorators/contact/folders';
import { ContactEditSection } from './edit-section';
import { PublicCertificateEditSection } from './public-cert-section';
import { CONTACTS } from '../../../constants/folders';
import wire from 'wiretie';
import { PhotoUpload } from '../photo-upload';

import { getDisplayName } from '../../../utils/contacts';
import {
	EMAIL,
	IM,
	HOME,
	WORK,
	NICKNAME,
	ADDRESS,
	ADD_MORE_FIELD_PLACEHOLDER,
	USER_CERTIFICATE,
	NEW_CONTACT_FIELDS,
	ADDRESS_FIELDS,
	ADD_MORE_FIELDS_DROPDOWN,
	DROPDOWN_LABEL_FIELDS,
	WORK_DETAILS_FIELDS,
	PERSONAL_DETAILS_FIELDS
} from './fields';

import {
	getAddressFieldPrefixAndSuffix,
	processContactAttrs,
	sorter,
	I18nText,
	generateFieldInfo,
	removeAttrSuffix,
	segregateAttributesIntoGroups,
	mergeContactAttributes,
	hasMinimumRequiredFields
} from './helper';
import ModalDialog from '../../modal-dialog';

const INVALID_EMAIL_MESSAGE_KEY = 'invalidEmail';
const MISMATCH_EMAIL_MESSAGE_KEY = 'emailMismatchWithCert';
const MINIMUM_FIELDS_REQUIRED_MESSAGE_KEY = 'minimumFieldsRequired';

/* eslint-disable react/display-name */
const input = type => props => <input type={type} {...props} />;

export const FIELD_MAPS = {
	email: input('email'),
	phone: input('tel'),
	mobile: input('tel'),
	homePhone: input('tel'),
	workPhone: input('tel'),
	fax: input('tel'),
	pager: input('tel'),
	birthday: 'date',
	anniversary: 'date',
	url: input('url'),
	Street: props => <textarea {...props} />,
	notes: props => <textarea {...props} />
};
/* eslint-enable react/display-name */

function getContactDetailsField(fields) {
	return fields.filter(
		field =>
			field !== ADD_MORE_FIELD_PLACEHOLDER &&
			field !== USER_CERTIFICATE &&
			WORK_DETAILS_FIELDS.indexOf(removeAttrSuffix(field)) === -1 &&
			PERSONAL_DETAILS_FIELDS.indexOf(removeAttrSuffix(field)) === -1
	);
}

function getWorkDetailsField(fields) {
	return fields.filter(field => WORK_DETAILS_FIELDS.indexOf(removeAttrSuffix(field)) > -1);
}

function getPersonalDetailsFields(fields) {
	return fields.filter(field => PERSONAL_DETAILS_FIELDS.indexOf(removeAttrSuffix(field)) > -1);
}

function updateAddMoreDropdownLabels([...addMoreDropdownFields], contactAttrs) {
	if (contactAttrs) {
		if (contactAttrs.im) {
			addMoreDropdownFields.splice(addMoreDropdownFields.indexOf(IM), 1);
		}
		if (contactAttrs.nickname) {
			addMoreDropdownFields.splice(addMoreDropdownFields.indexOf(NICKNAME), 1);
		}
		if (
			contactAttrs.homeStreet ||
			contactAttrs.homeCity ||
			contactAttrs.homeState ||
			contactAttrs.homePostalCode ||
			contactAttrs.homeCountry ||
			contactAttrs.workStreet ||
			contactAttrs.workCity ||
			contactAttrs.workState ||
			contactAttrs.workPostalCode ||
			contactAttrs.workCountry
		) {
			addMoreDropdownFields.splice(addMoreDropdownFields.indexOf(ADDRESS), 1);
		}
	}
	return addMoreDropdownFields;
}

function createFreshState({ contact, skipMissing }) {
	if (!contact) {
		contact = {};
	}

	contact = {
		...contact,
		attributes: {
			...(contact.attributes || contact._attrs || {})
		}
	};

	const addMoreDropdownFields = updateAddMoreDropdownLabels(
		ADD_MORE_FIELDS_DROPDOWN,
		contact.attributes
	);
	const updatedContact = processContactAttrs(contact);
	const attributesList = createAttributesList(updatedContact, skipMissing);
	return {
		contact: updatedContact,
		addMoreDropdownFields,
		attributesList,
		errors: null,
		offlineModal: false
	};
}

function createAttributesList(contact, skipMissing) {
	const attrs = contact.attributes;
	const mergedAttrsList = mergeContactAttributes(
		[...NEW_CONTACT_FIELDS, USER_CERTIFICATE],
		Object.keys(attrs)
	).filter(key => !skipMissing || attrs[key]);

	return mergedAttrsList;
}

const getFolder = (folders, ident) =>
	// eslint-disable-next-line eqeqeq
	folders.filter(f => f.absFolderPath == ident || f.name == ident || f.id == ident)[0];
@connect(
	state => ({
		isOffline: get(state, 'network.isOffline')
	}),
	null
)
@withGetContactFolders({
	skip: ({ allowMove }) => allowMove === false
})
@withCreateContact()
@withModifyContact()
@withAccountInfo(({ data: { accountInfo } }) => ({
	isSMimeEnabled: isSMIMEFeatureAvailable(accountInfo.license)
}))
@wire('zimbra', {}, zimbra => ({
	attach: zimbra.attachment.upload
}))
@withText('contacts.edit.addMore')
export default class ContactEditor extends Component {
	state = createFreshState(this.props);

	createContactFieldUpdater = memoize((field, isDate) => e => {
		let value;
		//handle case where value is the return object, like DateInput
		if (isDate) {
			value = format(e, 'YYYY-MM-DD');
		} else {
			//handle <input/> onInput events for different input types
			value =
				e.target.type === 'checkbox' || e.target.type === 'radio'
					? e.target.checked
					: e.target.value;
		}
		let { contact } = this.state;
		contact = {
			...contact,
			attributes: {
				...contact.attributes
			}
		};

		const parts = field.split('.');
		let obj = contact;
		for (let i = 0; i < parts.length - 1; i++) {
			obj = obj[parts[i]] || (obj[parts[i]] = {});
		}
		obj[parts[parts.length - 1]] = value;
		this.setState({ contact });
		if (this.props.onChange) {
			this.props.onChange({ contact });
		}
	});

	// update the fields suffixes to make them sequential
	// e.g if fields are email, email4 and email5 then change them to email, email2 and email3
	normalizeContactAttributes(contact) {
		const attributesList = [...this.state.attributesList];
		contact = deepClone(contact);

		const groups = segregateAttributesIntoGroups(attributesList, true);

		let allFieldsRenameMap = {};
		Object.keys(groups).forEach(group => {
			const currentGroupRenameMap = this.createFieldRenameMap(group, groups[group]);
			if (group === IM) {
				Object.keys(currentGroupRenameMap).map(label => {
					const currentAttrValue = contact.attributes[label];
					delete contact.attributes[label];
					contact.attributes[currentGroupRenameMap[label]] =
						removeAttrSuffix(label) + '://' + currentAttrValue;
				});
			} else if (group.indexOf(HOME) > -1 || group.indexOf(WORK) > -1) {
				// homeAddress or workAddress
				Object.keys(currentGroupRenameMap).map(label => {
					const newLabel = currentGroupRenameMap[label];
					const {
						prefix: originalFieldPrefix,
						suffix: originalFieldSuffix
					} = getAddressFieldPrefixAndSuffix(label);
					const { prefix: fieldPrefix } = getAddressFieldPrefixAndSuffix(newLabel);
					const suffix = this.createFieldSuffix(newLabel);
					ADDRESS_FIELDS.map(field => {
						replaceAttributes(
							contact.attributes,
							originalFieldPrefix + field + originalFieldSuffix,
							fieldPrefix + field + suffix
						);
					});
					// Update attribute list
					const index = attributesList.indexOf(label);
					if (index) {
						attributesList[index] = newLabel;
					}
				});
			} else {
				allFieldsRenameMap = {
					...allFieldsRenameMap,
					...currentGroupRenameMap
				};
			}
		});

		Object.keys(allFieldsRenameMap).map(label => {
			replaceAttributes(contact.attributes, label, allFieldsRenameMap[label]);

			const index = attributesList.indexOf(label);
			if (index && allFieldsRenameMap[label]) {
				attributesList[index] = allFieldsRenameMap[label];
			}
		});

		this.setState({ attributesList, contact });

		return contact;
	}

	// create field rename map required to make fields sequential
	// e.g email, email3, email7 -> email, email2, email3
	createFieldRenameMap(attr, fields) {
		const renameAttributesMap = {};
		fields.sort(sorter).map((originalAttr, index) => {
			const indexedFieldKey = `${attr}${index === 0 ? '' : index + 1}`;

			if (originalAttr !== indexedFieldKey) {
				renameAttributesMap[originalAttr] = indexedFieldKey;
			}
		});
		return renameAttributesMap;
	}

	getFormValueChanges = (contact, updatedContact) => {
		const allKeys = filterDuplicates(
			Object.keys(contact.attributes).concat(Object.keys(updatedContact.attributes))
		);
		const changes = allKeys.reduce((result, key) => {
			if (!isEqual(updatedContact.attributes[key], contact.attributes[key])) {
				result[key] = updatedContact.attributes[key] || null;
			}
			return result;
		}, []);

		return changes;
	};

	readContactPublicCert = certStr =>
		smimeHandler &&
		certStr &&
		smimeHandler({
			operation: 'get-cert',
			certData: certStr
		});

	save = () => {
		const { isOffline } = this.props;
		if (isOffline) {
			this.setState({
				offlineModal: true
			});
			return;
		}
		let { isNew } = this.props;
		const {
			contact,
			createContact,
			modifyContact,
			customSave,
			onBeforeSave,
			onSave,
			hideDialogOnError,
			onValidationError
		} = this.props;
		const { contact: contactData } = this.state;

		each(contactData.attributes, (value, key) => {
			if (value && value.trim) contactData.attributes[key] = value.trim();
		});

		if (!this.isContactValid(contactData)) {
			hideDialogOnError();
			onValidationError(true);
			return;
		}

		onValidationError(false);

		this.normalizeContactAttributes(contactData);

		isNew = isNew || !contactData.id;

		contactData.attributes.fullName = getDisplayName(get(contactData, 'attributes'), isNew);

		if (onBeforeSave) {
			onBeforeSave({ isNew, contact: contactData });
		}

		if (customSave) {
			return customSave({ isNew, contact: contactData });
		}

		if (isNew) {
			return createContact(contactData).then(onSave, this.showError);
		}

		const changes = this.getFormValueChanges(contact, contactData);

		modifyContact({
			id: contactData.id,
			attributes: changes
		}).then(onSave, this.showError);
	};

	isContactValid = contact => {
		let errors = {
			fields: [],
			messages: []
		};
		const attrs = contact.attributes;
		const { certEmail } = this.state;

		if (!hasMinimumRequiredFields(attrs)) {
			errors.messages.push(MINIMUM_FIELDS_REQUIRED_MESSAGE_KEY);
		} else {
			Object.keys(attrs).map(attribute => {
				const fieldInfo = generateFieldInfo(attribute);
				if (fieldInfo.group === EMAIL && attrs[attribute]) {
					if (!isValidEmail(attrs[attribute])) {
						if (errors.messages.indexOf(INVALID_EMAIL_MESSAGE_KEY) === -1) {
							errors.messages.push(INVALID_EMAIL_MESSAGE_KEY);
						}
					} else if (
						certEmail &&
						get(contact, 'attributes.email') !== certEmail &&
						errors.messages.indexOf(MISMATCH_EMAIL_MESSAGE_KEY) === -1
					) {
						errors.messages.push(MISMATCH_EMAIL_MESSAGE_KEY);
					}

					errors.fields.push(attribute);
				}
			});
		}
		if (!errors.messages.length) {
			errors = null;
		}
		this.setState({ errors });
		return !errors;
	};

	showError = error => {
		this.setState({
			messages: [error]
		});
	};

	updateLabel = ({ originalLabel, newLabel, group }) => {
		const attributesList = [...this.state.attributesList];
		let { contact } = this.state;
		contact = deepClone(contact);
		const newLabelWithSuffix = newLabel + this.createFieldSuffix(newLabel);

		if (group === ADDRESS) {
			const {
				prefix: originalFieldPrefix,
				suffix: originalFieldSuffix
			} = getAddressFieldPrefixAndSuffix(originalLabel);
			const { prefix: fieldPrefix } = getAddressFieldPrefixAndSuffix(newLabel);
			const suffix = this.createFieldSuffix(newLabel);
			ADDRESS_FIELDS.map(field => {
				const originalFieldKey = originalFieldPrefix + field + originalFieldSuffix;
				replaceAttributes(contact.attributes, originalFieldKey, fieldPrefix + field + suffix);
			});
		} else {
			replaceAttributes(contact.attributes, originalLabel, newLabelWithSuffix);
		}

		attributesList.splice(attributesList.indexOf(originalLabel), 1, newLabelWithSuffix);
		this.setState({ attributesList, contact });
		if (this.props.onChange) {
			this.props.onChange({ contact });
		}
	};

	addFieldFromAddMoreDropdown = field => {
		const addMoreDropdownFields = [...this.state.addMoreDropdownFields];
		const { attributesList } = this.state;

		this.addField({
			addAfterField: attributesList[attributesList.indexOf(ADD_MORE_FIELD_PLACEHOLDER) - 1],
			newFieldAttribute:
				(DROPDOWN_LABEL_FIELDS[field.value] && DROPDOWN_LABEL_FIELDS[field.value][0]) || // Dropdown fields: use first value from dropdown list
				field.value, // Non dropdown fields: use base type -> birthday etc
			group: field.value
		});

		addMoreDropdownFields.splice(addMoreDropdownFields.indexOf(field.value), 1);
		this.setState({ addMoreDropdownFields });
	};

	addField = ({ addAfterField, newFieldAttribute, group }) => {
		const attributesList = [...this.state.attributesList];
		let { contact } = this.state;
		contact = deepClone(contact);
		const newKeyWithSuffix = newFieldAttribute + this.createFieldSuffix(newFieldAttribute);

		if (group === ADDRESS) {
			//Handle address fields
			const suffix = this.createFieldSuffix(newFieldAttribute);
			ADDRESS_FIELDS.map(field => (contact.attributes['home' + field + suffix] = ''));
		} else {
			contact.attributes[newKeyWithSuffix] = '';
		}

		attributesList.splice(attributesList.indexOf(addAfterField) + 1, 0, newKeyWithSuffix);
		this.setState({ attributesList, contact });
		if (this.props.onChange) {
			this.props.onChange({ contact });
		}
	};

	createFieldSuffix = field => {
		const { attributesList } = this.state;

		let index = 0;
		do {
			const fieldLabelWithSuffix = field + (index === 0 ? '' : index + 1);
			if (attributesList.indexOf(fieldLabelWithSuffix) === -1) {
				break;
			}
		} while (++index);

		return index ? index + 1 : '';
	};

	removeField = ({ attribute, group }) => {
		const attributesList = [...this.state.attributesList];
		let { contact } = this.state;
		contact = deepClone(contact);

		attributesList.splice(attributesList.indexOf(attribute), 1);
		if (group === ADDRESS) {
			const { prefix, suffix } = getAddressFieldPrefixAndSuffix(attribute);
			ADDRESS_FIELDS.map(field => delete contact.attributes[prefix + field + suffix]);
		} else {
			delete contact.attributes[attribute];
		}
		this.setState({ attributesList, contact });
		if (this.props.onChange) {
			this.props.onChange({ contact });
		}
	};

	onCountrySelect = ({ selectedCountry, field }) => {
		let { contact } = this.state;
		contact = deepClone(contact);
		contact.attributes[field] = selectedCountry;
		this.setState({ contact });
		if (this.props.onChange) {
			this.props.onChange({ contact });
		}
	};

	saveImage = imageData =>
		// Convert base64 data to blob
		base64ToBlob(imageData).then(blob => {
			const { attach, onChange } = this.props;

			attach(blob, {
				filename: 'default.' + imageData.slice(imageData.indexOf('/') + 1, imageData.indexOf(';'))
			}).then(aid => {
				let { contact } = this.state;
				contact = deepClone(contact);
				contact.attributes.image = aid;

				this.setState(state => {
					const { contact: contactData } = state;
					contactData.attributes.image = aid;

					return {
						contact: contactData
					};
				});

				if (onChange) {
					onChange({ contact });
				}
			});
		});

	showRemoveButtonForGroup = group => {
		const { attributesList } = this.state;
		const groupLabels = DROPDOWN_LABEL_FIELDS[group] || [group]; //single label field like  birthday or anniversary

		const numOfFieldsOfType = attributesList.filter(
			fieldName => groupLabels.indexOf(removeAttrSuffix(fieldName)) > -1 //convert email2 to email
		).length;
		return numOfFieldsOfType > 1;
	};

	onAddCertificate = ({ userCertificate, certEmail }) => {
		const { contact } = this.state;
		contact.attributes = { ...contact.attributes, userCertificate };
		this.setState({ contact, certEmail });
	};

	onRemoveCertificate = () => {
		const { contact } = this.state;
		const { userCertificate, ...rest } = get(contact, 'attributes', {});
		contact.attributes = rest;
		this.setState({ contact });
	};

	onCloseOfflineModal = () => {
		this.setState({
			offlineModal: false
		});
	};

	componentDidMount() {
		const { contact, certEmail } = this.state;
		if (!certEmail) {
			const userCert = get(contact, 'attributes.userCertificate');
			const publicCertData = userCert && this.readContactPublicCert(userCert);
			publicCertData &&
				publicCertData.then(data =>
					this.setState({ certEmail: get(data, 'certificate.subject.email') })
				);
		}
	}

	componentWillReceiveProps({ saveOnConfirmDialog, isOffline, triggerSaveContact }) {
		// For offline prop change no need to perform any action
		if (isOffline !== this.props.isOffline) return;

		if (
			(triggerSaveContact && triggerSaveContact !== this.props.triggerSaveContact) ||
			(saveOnConfirmDialog && saveOnConfirmDialog !== this.props.saveOnConfirmDialog)
		) {
			this.save();
		}
	}

	shouldComponentUpdate({ contact, isNew }, { contact: updatedContact }) {
		if (!isNew && this._dirty) {
			const changes = this.getFormValueChanges(contact, updatedContact);
			const { onFormChange } = this.props;

			onFormChange && onFormChange(Object.keys(changes).length !== 0);
		}
	}

	render(
		{
			folder,
			folders,
			showCard,
			showHeader,
			showFooter,
			showTitle,
			skipMissing,
			allowMove,
			readonly,
			onCancel,
			isNew,
			footerClass,
			disabled,
			isSMimeEnabled,
			addMore,
			...props
		},
		{ contact, attributesList, errors, addMoreDropdownFields, offlineModal }
	) {
		const pfx = `contact-${getId(contact) || 'x'}-`;
		if (folders && !contact.folderId) {
			const parentFolder = getFolder(folders, folder) || getFolder(folders, CONTACTS);
			if (parentFolder) contact.folderId = parentFolder.id;
		}

		const detailFields = getContactDetailsField(attributesList);
		const workFields = getWorkDetailsField(attributesList);
		const personalFields = getPersonalDetailsFields(attributesList);

		return (
			<div
				class={cx(
					style.contactEditor,
					showHeader !== false && style.hasHeader,
					showFooter !== false && style.hasFooter,
					props.class
				)}
			>
				{showHeader && (
					<div class={style.header}>
						<h2>
							<Text id={`contacts.edit.${isNew ? 'add' : 'edit'}Contact`} />
						</h2>
					</div>
				)}

				<div class={cx(style.inner, style.contactEditFormWrapper)}>
					{errors && errors.messages && (
						<div key="error" class={style.error}>
							{errors.messages.map(error => (
								<span>
									<I18nText attribute={error} dictionary="errors" />
								</span>
							))}
						</div>
					)}

					{showCard !== false && <ContactCard contact={contact} />}

					<form action="javascript:" onSubmit={this.save} novalidate disabled={disabled}>
						<div class={style.avatar}>
							<PhotoUpload saveImage={this.saveImage} contact={contact} />
						</div>
						<ContactEditSection
							errorFields={errors && errors.fields}
							contact={contact}
							pfx={pfx}
							titleId={showTitle !== false && 'contacts.edit.details.contact'}
							fields={detailFields}
							readonly={readonly}
							onAddField={this.addField}
							showRemoveButtonForGroup={this.showRemoveButtonForGroup}
							onCountrySelect={this.onCountrySelect}
							onRemoveField={this.removeField}
							onFieldLabelChange={this.updateLabel}
							createContactFieldUpdater={this.createContactFieldUpdater}
						>
							{addMoreDropdownFields.length > 0 && (
								<label class={style.dropdownLabel}>
									<Select
										iconPosition="right"
										anchor="left"
										displayValue={addMore}
										value="none"
										onChange={this.addFieldFromAddMoreDropdown}
									>
										{addMoreDropdownFields.map(label => (
											<Option
												iconPosition="right"
												title={<I18nText attribute={label} />}
												value={label}
											/>
										))}
									</Select>
								</label>
							)}
						</ContactEditSection>

						{isSMimeEnabled && (
							<PublicCertificateEditSection
								title={<Text id="contacts.edit.details.secureCert" />}
								contactAttrs={contact.attributes}
								onAddCertificate={this.onAddCertificate}
								onRemoveCertificate={this.onRemoveCertificate}
							/>
						)}

						<ContactEditSection
							errorFields={errors && errors.fields}
							contact={contact}
							pfx={pfx}
							titleId="contacts.edit.details.work"
							fields={workFields}
							readonly={readonly}
							onAddField={this.addField}
							onRemoveField={this.removeField}
							onFieldLabelChange={this.updateLabel}
							createContactFieldUpdater={this.createContactFieldUpdater}
						/>

						<ContactEditSection
							errorFields={errors && errors.fields}
							contact={contact}
							pfx={pfx}
							titleId="contacts.edit.details.personal"
							fields={personalFields}
							readonly={readonly}
							onAddField={this.addField}
							onRemoveField={this.removeField}
							showRemoveButtonForGroup={this.showRemoveButtonForGroup}
							onFieldLabelChange={this.updateLabel}
							createContactFieldUpdater={this.createContactFieldUpdater}
						/>
					</form>
					{offlineModal && (
						<ModalDialog
							title="contacts.offlineModal.title"
							onAction={this.onCloseOfflineModal}
							onClose={this.onCloseOfflineModal}
							cancelButton={false}
						>
							<Text id="contacts.offlineModal.body" />
						</ModalDialog>
					)}
				</div>

				{showFooter !== false && (
					<div class={cx(style.footer, footerClass)}>
						<Button styleType="primary" brand="primary" onClick={this.save} disabled={disabled}>
							<Text id="buttons.save" />
						</Button>
						<Button styleType="default" onClick={onCancel} disabled={disabled}>
							<Text id="buttons.cancel" />
						</Button>
					</div>
				)}
			</div>
		);
	}
}
