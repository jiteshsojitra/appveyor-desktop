import isEmpty from 'lodash-es/isEmpty';
import { SORT_BY } from '../constants/search';

/**
 * Given two mail items, sort them based on the given sort value
 * Useful for callback to Array.prototype.sort
 * @param {String} sort    A sort by value ('dateDesc', 'dateAsc')
 * @param {Object} a       The left mail item to sort
 * @param {Object} b       The right mail item to sort
 * @example
 *   messages.sort((a, b) => doMailSort('dateDesc', a, b))
 *   messages.sort(doMailSort.bind(null, 'dateDesc'))
 */
export function doMailSort(sort, a, b) {
	switch (sort) {
		case SORT_BY.dateAsc:
			return a.date - b.date;
		case SORT_BY.dateDesc:
		default:
			return b.date - a.date;
	}
}

/**
 * Convert a Zimbra search query to a lunr.js search query
 */
export function zimbraQueryToLunrQuery(query) {
	// TODO: This needs to be made much more robust to make offline search decent.
	return query && query.replace('has:attachment', 'attachment:true');
}

export function getSearchQueryString(props) {
	const {
		query: q,
		email,
		folder,
		subject,
		contains,
		hasAttachment,
		hasImage,
		type,
		filename,
		before,
		after,
		from,
		to,
		inFolder,
		under,
		is,
		size,
		tag,
		cc
	} = props;
	let query = [q, email].filter(Boolean).join(' ');
	query = folder !== 'All' && !isEmpty(folder) ? query + ` in:"${folder}"` : query;

	if (subject) {
		const decoded = decodeURI(subject);
		query += ` subject:"${decoded}"`;
	}

	if (contains) {
		const decoded = decodeURI(contains);
		query += ` content:"${decoded}"`;
	}

	if (!isEmpty(after)) {
		const decodedAfter = decodeURI(after);
		query += ` after:"${decodedAfter}"`;
	}

	if (!isEmpty(before)) {
		const decodedBefore = decodeURI(before);
		query += ` before:"${decodedBefore}"`;
	}

	if (hasAttachment === 'true') {
		query += ` has:attachment`;
	}

	if (hasImage === 'true') {
		if (hasAttachment === 'true') {
			query += ' OR';
		}

		query += ' attachment:image/*';
	}

	if (type) {
		const decoded = decodeURI(type);
		if (hasAttachment === 'true') {
			query += ' OR';
		}

		query += ` attachment:"${decoded}"`;
	}

	if (filename) {
		const decoded = decodeURI(filename);
		if (hasAttachment === 'true') {
			query += ' OR';
		}

		query += ` filename:"${decoded}"`;
	}

	if (inFolder) {
		const decoded = decodeURI(inFolder);
		query += ` in:"${decoded}"`;
	}

	if (under) {
		const decoded = decodeURI(under);
		query += ` under:"${decoded}"`;
	}

	if (is) {
		const decoded = decodeURI(is);
		query += ` is:"${decoded}"`;
	}

	if (size) {
		const decoded = decodeURI(size);
		query += ` size:"${decoded}"`;
	}

	if (tag) {
		const decoded = decodeURI(tag);
		query += ` tag:"${decoded}"`;
	}

	if (from) {
		const fromQuery = decodeURI(from)
			.split(',')
			.map(address => `from:${address}`)
			.join(' OR ');
		query = `${query} ${fromQuery}`;
	}

	if (to) {
		const toQuery = decodeURI(to)
			.split(',')
			.map(address => `to:${address}`)
			.join(' OR ');
		query = `${query} ${toQuery}`;
	}

	if (cc) {
		const ccQuery = decodeURI(cc)
			.split(',')
			.map(address => `cc:${address}`)
			.join(' OR ');
		query = `${query} ${ccQuery}`;
	}
	return query;
}

export function getQueryOptions(searchQuery) {
	const newOpts = {
		subject: '',
		contains: '',
		before: '',
		after: '',
		type: '',
		inFolder: '',
		dateTypeValue: 'anytime'
	};
	let from, to, cc;

	const query = searchQuery.replace(/^(.*?)(\w+?:).*/g, '$1');

	if (searchQuery.match(/.*(in:")(.*?)".*/)) {
		newOpts.activeFolder = searchQuery.replace(/.*(in:")(.*?)".*/g, '$2');
	}

	if (searchQuery.match('subject:')) {
		const tempSubject = searchQuery.match(/(subject:)(\S*)/g);
		newOpts.subject =
			tempSubject.length &&
			tempSubject.map(f => f.replace(/subject:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('content:')) {
		const tempContent = searchQuery.match(/(content:)(\S*)/g);
		newOpts.contains =
			tempContent.length &&
			tempContent.map(f => f.replace(/content:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('after:')) {
		const tempAfter = searchQuery.match(/(after:)(\S*)/g);
		newOpts.after =
			tempAfter.length && tempAfter.map(f => f.replace(/after:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('before:')) {
		const tempBefore = searchQuery.match(/(before:)(\S*)/g);
		newOpts.before =
			tempBefore.length &&
			tempBefore.map(f => f.replace(/before:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('has:attachment')) {
		newOpts.hasAttachment = 'true';
	}

	if (searchQuery.match('attachment:')) {
		const tempType = searchQuery.match(/(attachment:)(\S*)/g);
		newOpts.type =
			tempType.length &&
			tempType.map(f => f.replace(/attachment:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('attachment:image')) {
		newOpts.hasImage = 'true';
	}

	if (searchQuery.match('filename:')) {
		const tempFilename = searchQuery.match(/(filename:)(\S*)/g);
		newOpts.filename =
			tempFilename.length &&
			tempFilename.map(f => f.replace(/filename:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('in:')) {
		const tempIn = searchQuery.match(/(in:)(\S*)/g);
		newOpts.inFolder =
			tempIn.length && tempIn.map(f => f.replace(/in:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('under:')) {
		const tempUnder = searchQuery.match(/(under:)(\S*)/g);
		newOpts.under =
			tempUnder.length && tempUnder.map(f => f.replace(/under:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('is:')) {
		const tempIs = searchQuery.match(/(is:)(\S*)/g);
		newOpts.is =
			tempIs.length && tempIs.map(f => f.replace(/is:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('size:')) {
		const tempSize = searchQuery.match(/(size:)(\S*)/g);
		newOpts.size =
			tempSize.length && tempSize.map(f => f.replace(/size:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('tag:')) {
		const tempTag = searchQuery.match(/(tag:)(\S*)/g);
		newOpts.tag =
			tempTag.length && tempTag.map(f => f.replace(/tag:/g, '').replace(/"/g, '')).toString();
	}

	if (searchQuery.match('from:')) {
		const tempFrom = searchQuery.match(/(from:)(\S*)/g);
		from = tempFrom.length && tempFrom.map(f => f.replace('from:', ''));
	}

	if (searchQuery.match('cc:')) {
		const tempCc = searchQuery.match(/(cc:)(\S*)/g);
		cc = tempCc.length && tempCc.map(f => f.replace('cc:', ''));
	}

	if (searchQuery.match('to:')) {
		const tempTo = searchQuery.match(/(to:)(\S*)/g);
		to = tempTo.length && tempTo.map(f => f.replace('to:', ''));
	}

	if (newOpts.before && newOpts.after) {
		const before = new Date(newOpts.before);
		const after = new Date(newOpts.after);
		const timeDiff = Math.abs(after.getTime() - before.getTime());
		const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

		switch (diffDays) {
			case 7:
				newOpts.dateTypeValue = 'last7';
				break;
			case 30:
				newOpts.dateTypeValue = 'last30';
				break;
			default:
				newOpts.dateTypeValue = 'customdate';
		}
	}

	newOpts.query = query.trim();
	newOpts.from = from && from.length ? from.join() : '';
	newOpts.to = to && to.length ? to.join() : '';
	newOpts.cc = cc && cc.length ? cc.join() : '';
	return newOpts;
}
