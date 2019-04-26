export const SORT_BY = {
	dateDesc: 'dateDesc',
	dateAsc: 'dateAsc',
	attachDesc: 'attachDesc', // attachments first
	flagDesc: 'flagDesc', // is flagged / starred
	nameAsc: 'nameAsc', // from address / sender
	rcptAsc: 'rcptAsc', // to address / recipient
	subjAsc: 'subjAsc', // subject
	readDesc: 'readDesc',
	sizeAsc: 'sizeAsc',
	sizeDesc: 'sizeDesc'
};
export const DEFAULT_SORT = SORT_BY.dateDesc;
export const DEFAULT_LIMIT = 100;
export const DATE_FORMAT = 'YYYY-MM-DD';
export const SEARCH_TYPE = {
	contacts: 'contacts',
	mail: 'mail'
};
