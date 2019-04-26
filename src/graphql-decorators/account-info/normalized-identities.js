import { graphql } from 'react-apollo';
import find from 'lodash-es/find';
import get from 'lodash-es/get';
import map from 'lodash-es/map';
import compact from 'lodash-es/compact';
import pick from 'lodash-es/pick';

import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';

function getSignature(signatureId, signatures) {
	return get(find(signatures, s => s.id === signatureId), 'content.0._content');
}

function normalizeIdentity(identity, accountInfo) {
	const defaultSignature = getSignature(
		identity._attrs.zimbraPrefDefaultSignatureId,
		get(accountInfo, 'signatures.signature', [])
	);

	const forwardReplySignature = getSignature(
		identity._attrs.zimbraPrefForwardReplySignatureId,
		get(accountInfo, 'signatures.signature', [])
	);

	return {
		...identity,
		emailAddress: identity._attrs.zimbraPrefFromAddress,
		defaultSignature: identity._attrs.zimbraPrefDefaultSignatureId,
		forwardReplySignature: identity._attrs.zimbraPrefForwardReplySignatureId,
		fromDisplay: identity._attrs.zimbraPrefFromDisplay,
		isPrimaryAccount: identity.id === accountInfo.id,
		name: identity._attrs.zimbraPrefIdentityName,
		replyToAddress: identity._attrs.zimbraPrefReplyToAddress,
		replyToDisplay: identity._attrs.zimbraPrefReplyToDisplay,
		replyToEnabled: identity._attrs.zimbraPrefReplyToEnabled,
		defaultSignatureValue: defaultSignature,
		forwardReplySignatureValue: forwardReplySignature,
		showSignatureEditor: !!defaultSignature
	};
}

function denormalizeIdentity(identity) {
	return {
		zimbraPrefFromAddress: identity.emailAddress,
		zimbraPrefDefaultSignatureId: identity.defaultSignature,
		zimbraPrefForwardReplySignatureId: identity.forwardReplySignature,
		zimbraPrefFromDisplay: identity.fromDisplay,
		zimbraPrefIdentityName: identity.name,
		zimbraPrefReplyToAddress: identity.replyToAddress,
		zimbraPrefReplyToDisplay: identity.replyToDisplay,
		zimbraPrefReplyToEnabled: identity.replyToEnabled
	};
}

function normalizeDataSource(source, type, accountInfo) {
	const defaultSignature = getSignature(
		source.defaultSignature,
		get(accountInfo, 'signatures.signature', [])
	);

	const forwardReplySignature = getSignature(
		source.forwardReplySignature,
		get(accountInfo, 'signatures.signature', [])
	);

	return {
		...source,
		accountType: type,
		emailAddress: source.emailAddress || `${source.username}@${source.host}`,
		name: source.name,
		replyToEnabled: source.useAddressForForwardReply,
		defaultSignatureValue: defaultSignature,
		forwardReplySignatureValue: forwardReplySignature,
		showSignatureEditor: !!defaultSignature
	};
}

function denormalizeDataSource(dataSource) {
	return {
		...pick(dataSource, [
			'emailAddress',
			'defaultSignature',
			'fromDisplay',
			'name',
			'replyToAddress',
			'replyToDisplay',
			'importOnly',
			'isEnabled',
			'forwardReplySignature'
		]),
		useAddressForForwardReply: dataSource.replyToEnabled
	};
}

/**
 * This container does normalization of account data that is useful
 * when dealing with internal account identities and external (IMAP/POP)
 * accounts.
 */
export default function withNormalizedIdentitesAccountInfo(options = {}) {
	return graphql(AccountInfoQuery, {
		name: 'accountInfoQuery',
		options: {
			fetchPolicy: options.fetchPolicy
		},
		props: ({
			accountInfoQuery,
			accountInfoQuery: {
				accountInfo = {
					identities: { identity: [] },
					dataSources: [{ imap: [], pop3: [] }],
					signatures: { signature: [] }
				}
			}
		}) => ({
			accountInfoQuery,
			accountInfo,
			accounts: compact([
				...map(accountInfo.identities.identity, i => normalizeIdentity(i, accountInfo)),
				...map(accountInfo.dataSources.imap || [], i =>
					normalizeDataSource(i, 'imap', accountInfo)
				),
				...map(accountInfo.dataSources.pop3 || [], i => normalizeDataSource(i, 'pop3', accountInfo))
			]),
			normalizeDataSource,
			denormalizeDataSource,
			normalizeIdentity,
			denormalizeIdentity,
			signatures: get(accountInfo, 'signatures.signature')
		})
	});
}
