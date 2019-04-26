import get from 'lodash-es/get';
import find from 'lodash-es/find';
import includes from 'lodash-es/includes';

function identityFromAddress(i) {
	return (i && i.zimbraPrefFromAddress) || get(i, '_attrs.zimbraPrefFromAddress');
}

function getIdentities(account) {
	// legacy zimbra-client normalized data used `account.identities`
	return get(account, 'identities.identity') || account.identities || [];
}

export function getAccountAddresses(account) {
	return getIdentities(account).map(identityFromAddress);
}

export function getPrimaryAccountAddress(account) {
	const identities = getIdentities(account);
	const identity = find(identities, i => i.id === account.id) || identities[0];
	return identityFromAddress(identity);
}

/**
 * Get the 'from' email address for a given identity or imap datasource on the account
 * @param {*} account account object for the active user
 * @param {*} id of the identity or imap datasource
 * @returns {String} email address for the id
 */
export function getAccountFromAddressForId(account, id) {
	const identities = getIdentities(account);
	const identity = find(identities, i => i.id === id);
	if (identity) {
		return identityFromAddress(identity);
	}
	const imap = find(get(account, 'dataSources.imap'), i => i.id === id);
	return imap && imap.emailAddress;
}

/**
 * Get the 'to' email address for a given identity or imap datasource on the account
 * @param {*} account account object for the active user
 * @param {*} id of the identity or imap datasource
 * @returns {String} email 'to' address for the id
 */
export function getAccountToAddressForId(account, id) {
	const identities = getIdentities(account);
	const identity = find(identities, i => i.id === id);
	if (identity) {
		return account.name;
	}
	const imap = find(get(account, 'dataSources.imap'), i => i.id === id);
	return imap && imap.emailAddress;
}

/**
 * Return a a function that returns true if the address key on the argument does not match any of the addresses associated with the account identities
 * @param {Object} account
 * @returns {Function}
 */
export function withoutAccountAddresses(account) {
	return sender => !isAccount(account, sender);
}

/**
 * Test if the senders address is an account address
 * @param {Object} account
 * @returns {Boolean} true if the address of the sender matches one of the addresses in the account identities, false otherwise
 */
export function isAccount(account, sender) {
	const accountAddresses = getAccountAddresses(account);
	return includes(accountAddresses, sender.address);
}

export function getPrimaryAccountName(account) {
	return get(account, 'attrs.displayName') || getPrimaryAccountAddress(account);
}

export function getPrimaryAccount(accounts) {
	return (accounts && accounts.length && find(accounts, { isPrimaryAccount: true })) || undefined;
}
