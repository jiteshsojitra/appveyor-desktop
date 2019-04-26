import get from 'lodash-es/get';
import { parseAddress, suffixArray, getEmail as normalizeEmail } from '../lib/util';
import { CONTACT_GROUP_PREFIX, PROFILE_IMAGE_WIDTH } from '../constants/contacts';

const ADDRESS_TYPES = {
	home: ['homeStreet', 'homeCity', 'homeState', 'homePostalCode', 'homeCountry']
	//	work: [ 'workStreet', 'workCity', 'workState', 'workPostalCode', 'workCountry' ] // Currently unused
};
const ADDRESS_SUFFIXES = ['Street', 'City', 'State', 'Postal', 'Country'];
const ADDRESS_PREFIXES = ['work', 'home'];
const PHONE_TYPES = ['phone', 'mobile', 'homePhone', 'workPhone', 'fax', 'pager'];
const EMAIL_TYPES = ['email', 'workEmail', 'homeEmail'];
const DEFAULT_FILEAS = 2;

// Add numbers 1-9 to EMAIL_TYPES
const EXTENDED_EMAIL_TYPES = suffixArray(EMAIL_TYPES, ['', 1, 2, 3, 4, 5, 6, 7, 8, 9]);

export function getJobDescription(contactAttributes) {
	return `${contactAttributes.jobTitle || ''}${
		contactAttributes.jobTitle && contactAttributes.company ? ', ' : ''
	}${contactAttributes.company || ''}`;
}

/**
 * Return a valid display name for a GetContactsResponse or an
 * AutoCompleteResponse.
 * @param  {[type]} contact [description]
 * @return {[type]}         [description]
 */
export function displayAddress(contact) {
	return (
		get(contact, 'attributes.fullName') ||
		(get(contact, 'attributes.firstName') &&
			get(contact, 'attributes.lastName') &&
			`${contact.attributes.firstName} ${contact.attributes.lastName}`) ||
		get(contact, 'attributes.firstName') ||
		get(contact, 'attributes.company') ||
		(get(contact, 'attributes.email') && get(contact, 'attributes.email').split('@')[0]) ||
		contact.full ||
		contact.fullName ||
		contact.name ||
		contact.first ||
		contact.company ||
		(contact.address || contact.email || '').split('@')[0].split('<')[1] ||
		(contact.address || contact.email || '').split('@')[0] ||
		(contact.isGroup && contact.display) ||
		''
	);
}

/**
 * Returns a valid email address for a GetContactsResponse or an
 * AutoCompleteResponse.
 */
export function getEmail(contact) {
	return get(contact, 'attributes.email') || normalizeEmail(contact.email);
}

/**
 * Get the primary name of a contact. This is the fullName, or combined first/middle/last name, or company name.
 */
export function getName({ fullName, firstName, middleName, lastName, company, ...restAttributes }) {
	const email = getPrimaryEmail({ attributes: restAttributes });
	const phone = getPrimaryPhone({ attributes: restAttributes });
	return (
		fullName ||
		[firstName, middleName, lastName].filter(Boolean).join(' ') ||
		company ||
		(email && email.split('@')[0]) ||
		phone
	);
}

export function getDisplayName(
	{ fileAs, namePrefix, firstName, middleName, lastName, maidenName, nameSuffix, company },
	isNew
) {
	let infoWithBrackets;
	const fieldsToJoin = [];

	fileAs = isNew && !fileAs ? DEFAULT_FILEAS : fileAs;

	switch (fileAs) {
		case 0: // Format: Prefix First Middle (Maiden) Last, Suffix
			maidenName =
				(namePrefix || firstName || middleName || lastName || nameSuffix) && maidenName
					? `(${maidenName})`
					: maidenName;
			lastName = nameSuffix && lastName ? `${lastName},` : lastName;
			fieldsToJoin.push(namePrefix, firstName, middleName, maidenName, lastName, nameSuffix);
			break;
		case 1: // Format: Last, First Middle
			lastName = (firstName || middleName) && lastName ? `${lastName},` : lastName;
			fieldsToJoin.push(lastName, firstName, middleName);
			break;
		case 3: // Company
			return company;
		case 4: // Format: Last, First Middle (Company)
			company = (firstName || middleName || lastName) && company ? `(${company})` : company;
			lastName = (firstName || middleName) && lastName ? `${lastName},` : lastName;
			fieldsToJoin.push(lastName, firstName, middleName, company);
			break;
		case 5: // Format: First Middle Last (Company)
			company = (firstName || middleName || lastName) && company ? `(${company})` : company;
			fieldsToJoin.push(firstName, middleName, lastName, company);
			break;
		case 6: // Format: Company (Last, First Middle)
			lastName = (firstName || middleName) && lastName ? `${lastName},` : lastName;
			infoWithBrackets = [lastName, firstName, middleName].filter(Boolean).join(' ');
			infoWithBrackets =
				(firstName || middleName || lastName) && company
					? `(${infoWithBrackets})`
					: infoWithBrackets;
			fieldsToJoin.push(company, infoWithBrackets);
			break;
		case 7: // Format: Company (First Middle Last)
			infoWithBrackets = [firstName, middleName, lastName].filter(Boolean).join(' ');
			infoWithBrackets =
				(firstName || middleName || lastName) && company
					? `(${infoWithBrackets})`
					: infoWithBrackets;
			fieldsToJoin.push(company, infoWithBrackets);
			break;
		default:
			//  Format: First Middle Last
			fieldsToJoin.push(firstName, middleName, lastName);
			break;
	}

	return fieldsToJoin.filter(Boolean).join(' ');
}

/**
 * Print a formatted address from a contact.
 * @param {Object} contact        The contact to be printed
 * @returns {String}              Returns a formatted address for that contact
 */
export function printAddress(attributes) {
	return [
		attributes.Street,
		attributes.City,
		[attributes.State, attributes.Postal].filter(Boolean).join(' '),
		attributes.Country
	]
		.filter(Boolean)
		.join(', ');
}

/**
 * Returns a printed address of either home or work.
 * @param {Object} contact        The contact to be printed
 * @returns {String}              The address printed by {@function printAddress}
 */
export function getPrimaryAddress(contact) {
	if (findSomeDefinedKey(contact.attributes, ADDRESS_TYPES.home)) {
		return printAddress('home', contact);
	}

	return printAddress('work', contact);
}

/**
 * Returns a all address array that can be print
 * @param {Object} contact        The contact to be
 * @returns {Array}         return array that to be printed
 */
export function getAddressArray({ ...contact }) {
	const addressArray = [];
	for (let i = 0; i <= ADDRESS_PREFIXES.length; i++) {
		let count = 0;
		const prefix = ADDRESS_PREFIXES[i];
		do {
			count++;
			contact.address = null;
			for (let j = 0; j < ADDRESS_SUFFIXES.length; j++) {
				const suffix = ADDRESS_SUFFIXES[j];
				const name = [prefix, suffix, count > 1 ? count : ''].join('');
				const value = contact.attributes[name];
				if (!value) {
					continue;
				}
				if (!contact.address) {
					contact.address = {};
				}
				contact.address[suffix] = value;
				contact.address.type = ADDRESS_PREFIXES[i];
			}
		} while (contact.address && addressArray.push(contact.address));
	}
	return addressArray;
}

/**
 * Get the primary phone number for a contact.
 * @param {Object} contact     The contact to retrieve the phone number from.
 * @returns {String}           The primary phone number of the given contact.
 */
export function getPrimaryPhone(contact) {
	return get(contact, `attributes.${getPrimaryPhoneType(contact)}`);
}

/**
 * Get the primary phone type for a contact.
 * @param {Object} contact     The contact to retrieve the primary phone type from.
 * @returns {String}           The primary phone type of the given contact. One of [ 'phone', 'mobile', 'homePhone', 'workPhone', 'fax', 'pager' ].
 */
export function getPrimaryPhoneType({ attributes } = {}) {
	return findSomeDefinedKey(attributes, PHONE_TYPES);
}

/**
 * Get the primary email for a contact.
 * @param {Object} contact     The contact to retrieve the email address from.
 * @returns {String}           The primary email address of the given contact.
 */
export function getPrimaryEmail(contact) {
	return get(contact, `attributes.${getPrimaryEmailType(contact)}`);
}

/**
 * Get the primary email type for a contact.
 * @param {Object} contact     The contact to retrieve the email type from.
 * @returns {String}           The primary email type of the given contact. One of [ 'email', 'homeEmail', 'workEmail' ].
 */
export function getPrimaryEmailType({ attributes } = {}) {
	return findSomeDefinedKey(attributes, EXTENDED_EMAIL_TYPES);
}

/**
 * Given an object and an array of keys, return the first key found on that object.
 * @param {Object} obj         The object to be searched.
 * @param {String[]} keys      The keys to search for in {@param obj}.
 * @returns {String}           The first key found in {@param obj}.
 * @example
 *   let obj = { fooKey: 'foo', barKey: 'bar' };
 *   let keys = [ 'junk', 'fooKey' ];
 *   assert(findSomeDefinedKey(obj, keys) === 'fooKey')
 */
export function findSomeDefinedKey(obj, keys) {
	if (obj && keys && keys.length) {
		for (const index in keys) {
			if (keys[index] in obj) {
				return keys[index];
			}
		}
	}
}

/**
 * Given an object and the key,return the array of values found on that object based on what key we passed
 * @param {Object} obj         The object to be seperate.
 * @param {String} key      The key to search for in {@param obj}.
 * @returns {Array}
 * @example
 *   let obj = { fooKey: 'foo', fooKey2: 'bar' , booKey : 'bar2' };
 *   let key = 'fooKey'
 *  return ['foo','bar'];
 */
export function groupBy(obj, key) {
	const matcher = new RegExp(`^${key}\\d*$`);
	return Object.keys(obj)
		.filter(k => matcher.test(k))
		.sort((a, b) => {
			a = Number(a.slice(1)) || 1;
			b = Number(b.slice(1)) || 1;
			return a === b ? 0 : a > b ? 1 : -1;
		})
		.map(k => obj[k]);
}

export function getAttachedImageUrl(contact, zimbraOrigin, zimbraBatchClient) {
	const {
		id,
		attributes: { image }
	} = contact;

	// 240 pixel image used since it is the largest size required.
	const imgSizeParameters = `&max_width=${PROFILE_IMAGE_WIDTH}&max_height=${PROFILE_IMAGE_WIDTH}`;
	let imageUrl = '';

	if (image) {
		// Image is uploaded but not saved in contact object
		if (typeof image == 'string') {
			imageUrl = `${zimbraOrigin}/service/content/proxy?aid=${image}`;
		} else {
			imageUrl = zimbraBatchClient.getContactProfileImageUrl(
				{
					part: image.part,
					mid: id
				},
				true
			);
		}
	}

	return imageUrl && `${imageUrl}${imgSizeParameters}`;
}

/**
 * Given a String (Complete Contact Group Tag like:- `group:1234` ), return the Group ID (1234).
 * @param {String} groupTag
 * @returns {String}
 */
export function getContactGroupFolderId(groupTag) {
	return (groupTag || '').replace(CONTACT_GROUP_PREFIX, '').trim();
}

/**
 * Convert a GAL-style address to an emulated Contact entry (with composite generated ID)
 */
export function addressToContact(addr) {
	// already a Contact entity
	if (addr.attributes) return addr;

	const { type, name, shortName, address, thumbnailPhoto } = addr;
	const id = `${type}::${shortName}::${address}`,
		fullName = name || shortName || address.split('@')[0],
		parts = fullName.split(' ');

	return {
		id,
		attributes: {
			email: address,
			fullName,
			firstName: parts[0],
			lastName: parts.slice(1).join(' '),
			thumbnailPhoto,
			isGalContact: addr.isGalContact
		}
	};
}

/**
 * Convert a contact to a GAL-style address
 */
export function addressFromContact(contact) {
	const attrs = contact.attributes || contact._attrs || contact,
		parsed = parseAddress(attrs.email);

	return {
		address: parsed.address,
		name: attrs.fullName || displayAddress(contact),
		shortName: attrs.firstName || attrs.first || parsed.name,
		originalEmail: attrs.email,
		thumbnailPhoto: attrs.thumbnailPhoto,
		isGalContact: contact.isGalContact,
		...(contact &&
			contact.zimbraCalResType && {
				zimbraCalResType: contact.zimbraCalResType
			}),
		attributes: contact.attributes,
		id: contact.id
	};
}
