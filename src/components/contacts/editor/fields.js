export const NICKNAME = 'nickname';
export const HOME = 'home';
export const WORK = 'work';
export const EMAIL = 'email';
export const PHONE = 'phone';
export const ADDRESS = 'address';
export const IM = 'im';
export const ANNIVERSARY = 'anniversary';
export const BIRTHDAY = 'birthday';
export const COUNTRY = 'Country';
export const ADD_MORE_FIELD_PLACEHOLDER = '{add_more_field_placeholder}';
export const IMAGE = 'image';
export const USER_CERTIFICATE = 'userCertificate';

export const NEW_CONTACT_FIELDS = [
	'firstName',
	'middleName',
	'lastName',
	'email',
	'phone',
	ADD_MORE_FIELD_PLACEHOLDER,
	'jobTitle',
	'company',
	BIRTHDAY,
	ANNIVERSARY,
	'website',
	'notes'
];

export const ADDRESS_FIELDS = ['Street', 'City', 'State', 'Postal', COUNTRY];

export const ADD_MORE_FIELDS_DROPDOWN = [IM, NICKNAME, ADDRESS];

export const NON_DROPDOWN_LABEL_ADD_REMOVE_FIELDS = [ANNIVERSARY, BIRTHDAY];

export const DROPDOWN_LABEL_FIELDS = {
	[EMAIL]: ['email', 'workEmail', 'homeEmail'],
	[PHONE]: ['mobile', 'phone', 'homePhone', 'workPhone', 'pager', 'fax'],
	[IM]: ['yahoo', 'xmpp', 'aol', 'msn'],
	[ADDRESS]: ['homeAddress', 'workAddress']
};

export const WORK_DETAILS_FIELDS = ['company', 'jobTitle'];
export const PERSONAL_DETAILS_FIELDS = [BIRTHDAY, ANNIVERSARY, 'notes', 'website', 'notes'];
