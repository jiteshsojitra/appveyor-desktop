import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import filter from 'lodash/filter';
import { parseURI } from '../lib/util';

export function getPublicGrant(acl) {
	return find(acl.grant, ['granteeType', 'pub']);
}

export function getEmailGrants(acl) {
	return filter(acl.grant, g => g && g.granteeType && g.granteeType.match(/usr|guest/));
}

export function addPublicGrant(acl = {}) {
	if (getPublicGrant(acl)) return acl;
	return {
		...acl,
		grant: [
			...(acl.grant || []),
			{
				granteeType: 'pub',
				permissions: 'r'
			}
		]
	};
}

export function removePublicGrant(acl) {
	return {
		...acl,
		grant: filter(acl.grant, g => g.granteeType !== 'pub')
	};
}

export function removeEmailGrant(acl, grant) {
	return {
		...acl,
		grant: filter(acl.grant, g => g.zimbraId !== grant.zimbraId)
	};
}

export function updateGrant(acl, nextGrant) {
	const grantIndex = findIndex(acl.grant, g => g.zimbraId === nextGrant.zimbraId);
	if (grantIndex === -1) {
		return acl;
	}

	const nextArray = [...acl.grant];
	nextArray.splice(grantIndex, 1, nextGrant);

	return {
		...acl,
		grant: nextArray
	};
}

export function addEmailGrants(acl, emails, permissions, zimbraPublicURL) {
	const uri = parseURI(zimbraPublicURL);
	const onDomainRE = new RegExp(`@${uri.hostname}$`);
	return {
		...acl,
		grant: [
			...acl.grant.map(g => ({
				...g,
				address: g.granteeType === 'guest' ? g.zimbraId : g.address
			})),
			...emails.map(e => ({
				permissions,
				granteeType: onDomainRE.test(e) ? 'usr' : 'guest',
				address: e,
				password: ''
			}))
		]
	};
}
