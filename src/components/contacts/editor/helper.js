import { h } from 'preact';
import { Text } from 'preact-i18n';
import { deepClone, capitalizeFirstLetter } from '../../../lib/util';

import {
	NICKNAME,
	PHONE,
	EMAIL,
	HOME,
	WORK,
	ADDRESS,
	IM,
	ADDRESS_FIELDS,
	DROPDOWN_LABEL_FIELDS,
	ADD_MORE_FIELD_PLACEHOLDER,
	NON_DROPDOWN_LABEL_ADD_REMOVE_FIELDS,
	IMAGE
} from './fields';

export function removeAttrSuffix(key) {
	return key.replace(/\d+/g, '');
}

export function getAddressFieldPrefixAndSuffix(attribute) {
	const suffix = attribute.replace(/^\D+/g, '');
	const prefix = attribute.includes(HOME) ? HOME : WORK;
	return {
		prefix,
		suffix
	};
}

const HOME_ADDRESS = HOME + capitalizeFirstLetter(ADDRESS);
const WORK_ADDRESS = WORK + capitalizeFirstLetter(ADDRESS);
// Can be either workAddress or homeAddress
// or internal address fields (City, Country, State, Street, Postal)
export function isAddressField(field) {
	// check if homeAddress/workAddress label
	if (field.indexOf(HOME_ADDRESS) > -1 || field.indexOf(WORK_ADDRESS) > -1) {
		return true;
	}

	// check if one of Address fields from contact attribute (homeStreet, workStreet etc)
	return ADDRESS_FIELDS.some(addrField => field.indexOf(addrField) > -1);
}

function checkIfDropdownField(field) {
	const result = {
		isDropdownField: false
	};
	Object.keys(DROPDOWN_LABEL_FIELDS).some(group => {
		if (DROPDOWN_LABEL_FIELDS[group].includes(field)) {
			result.isDropdownField = true;
			result.group = group;
			return true;
		}
	});

	return result;
}

// group -> (if dropdown field) parent group label (email, phone, im, address)
// nonSuffixedAttribute -> non suffixed attribute
// attribute -> contact's attribute (with or without suffix) [e.g email2, workPhone3, anniversary etc]
export function generateFieldInfo(attribute) {
	const nonSuffixedAttribute = removeAttrSuffix(attribute);
	const fieldInfo = {
		attribute,
		nonSuffixedAttribute
	};

	if (isAddressField(attribute)) {
		fieldInfo.group = ADDRESS;
		fieldInfo.isAddressField = true;
	} else {
		const fieldDetails = checkIfDropdownField(nonSuffixedAttribute);
		if (fieldDetails.isDropdownField) {
			fieldInfo.group = fieldDetails.group;
		}
	}

	if (fieldInfo.group) {
		fieldInfo.hasDropdownLabels = true;
		fieldInfo.dropdownLabels = DROPDOWN_LABEL_FIELDS[fieldInfo.group];
	}

	if (
		fieldInfo.hasDropdownLabels ||
		NON_DROPDOWN_LABEL_ADD_REMOVE_FIELDS.includes(nonSuffixedAttribute)
	) {
		fieldInfo.showAddRemoveButtons = true;
	}

	return fieldInfo;
}

// groupByLabels (true) => workEmail, workEmail2 are grouped as workEmail
// groupByLabels (false) => workEmail, workEmail2, homeEmail are grouped under parent field -> 'email'
export function segregateAttributesIntoGroups(attributesList, groupByLabels = false) {
	const groups = {};

	attributesList.map(attribute => {
		const fieldInfo = generateFieldInfo(attribute);
		let groupName = groupByLabels ? fieldInfo.nonSuffixedAttribute : fieldInfo.group;
		if (fieldInfo.isAddressField) {
			if (!groups[groupName]) {
				groups[groupName] = [];
			}

			if (groupByLabels) {
				//group under homeAddress / workAddress
				groups[groupName].push(fieldInfo.attribute);
			} else {
				//group under address from homeCity, homeStreet etc.
				const { prefix, suffix } = getAddressFieldPrefixAndSuffix(attribute);
				if (!groups[groupName]) {
					groups[groupName] = [];
				}
				const key = prefix + capitalizeFirstLetter(ADDRESS) + suffix;
				groups.address.indexOf(key) === -1 ? groups.address.push(key) : '';
			}
		} else if (fieldInfo.hasDropdownLabels) {
			if (groupByLabels && fieldInfo.group === IM) groupName = IM;
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			groups[groupName].push(attribute);
		} else if (fieldInfo.showAddRemoveButtons) {
			if (!groups[fieldInfo.nonSuffixedAttribute]) {
				groups[fieldInfo.nonSuffixedAttribute] = [];
			}
			groups[fieldInfo.nonSuffixedAttribute].push(attribute);
		}
	});

	return groups;
}

export function mergeContactAttributes(baseContactFields, currentContactFields) {
	const attributeGroups = segregateAttributesIntoGroups(currentContactFields);
	// Add hidden links from Add More dropdown to the basic details list
	if (currentContactFields.includes(NICKNAME)) {
		baseContactFields.splice(baseContactFields.indexOf(ADD_MORE_FIELD_PLACEHOLDER), 0, NICKNAME);
	}
	if (attributeGroups.im && attributeGroups.im.length) {
		baseContactFields.splice(baseContactFields.indexOf(ADD_MORE_FIELD_PLACEHOLDER), 0, IM);
	}
	if (attributeGroups.address && attributeGroups.address.length) {
		baseContactFields.splice(baseContactFields.indexOf(ADD_MORE_FIELD_PLACEHOLDER), 0, ADDRESS);
	}

	const mergedFields = baseContactFields.reduce((attrsList, attribute) => {
		if (attributeGroups[attribute] && attributeGroups[attribute].length) {
			return attrsList.concat(attributeGroups[attribute].sort(sorter));
		}

		attrsList.push(attribute);
		return attrsList;
	}, []);
	return mergedFields;
}

export function processContactAttrs(originalContact) {
	const contact = deepClone(originalContact);
	Object.keys(contact.attributes).map(attribute => {
		if (attribute !== IMAGE && attribute.indexOf(IM) > -1) {
			if (!contact.attributes[attribute]) return;

			const [imType, imId] = contact.attributes[attribute].split('://');
			delete contact.attributes[attribute];
			let index = 0;
			do {
				const labelWithSuffix = imType + (index === 0 ? '' : index + 1);
				if (!contact.attributes.hasOwnProperty(labelWithSuffix)) {
					contact.attributes[labelWithSuffix] = imId;
					break;
				}
			} while (++index);
		}
	});
	return contact;
}

export function createFieldRenameMap(attr, fields) {
	const renameAttributesMap = {};
	fields.sort(sorter).map((originalAttr, index) => {
		const indexedFieldKey = `${attr}${index === 0 ? '' : index + 1}`;

		if (originalAttr !== indexedFieldKey) {
			renameAttributesMap[originalAttr] = indexedFieldKey;
		}
	});
	return renameAttributesMap;
}

const words = str => str.replace(/([A-Z])/, ' $1').toLowerCase();
export function sorter(a, b) {
	a = words(a);
	b = words(b);
	return a === b ? 0 : a > b ? 1 : -1;
}

// Contact should have either firstName, lastName, company, email or phone to be saved
export function hasMinimumRequiredFields(attrs) {
	let hasRequiredFields = true;

	if (!attrs.firstName && !attrs.lastName && !attrs.company) {
		hasRequiredFields = false;
	}

	Object.keys(attrs).map(attribute => {
		const fieldInfo = generateFieldInfo(attribute);
		if (fieldInfo.group === EMAIL) {
			if (!attrs[attribute] && !hasRequiredFields) {
				hasRequiredFields = false;
			} else {
				hasRequiredFields = true;
			}
		} else if (fieldInfo.group === PHONE && !hasRequiredFields) {
			hasRequiredFields = !!attrs[attribute];
		}
	});

	return hasRequiredFields;
}

export function I18nText({ attribute, dictionary = 'fields' }) {
	return (
		<Text id={`contacts.edit.${dictionary}.${removeAttrSuffix(attribute)}`}>
			{attribute.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}
		</Text>
	);
}
