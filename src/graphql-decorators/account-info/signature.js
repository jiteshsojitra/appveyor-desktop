import { graphql } from 'react-apollo';
import get from 'lodash-es/get';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';
import modifySignature from '../../graphql/queries/accounts/account-modify-signature-mutation.graphql';
import deleteSignature from '../../graphql/queries/accounts/account-delete-signature-mutation.graphql';
import createSignature from '../../graphql/queries/accounts/account-create-signature-mutation.graphql';

export function withModifySignature() {
	return graphql(modifySignature, {
		props: ({ mutate }) => ({
			modifySignature: ({ id, contentType, value }) =>
				mutate({
					variables: {
						signature: {
							id,
							content: {
								type: contentType,
								_content: value
							}
						}
					},
					refetchQueries: [
						{
							query: AccountInfoQuery
						}
					],
					optimisticResponse: {
						__typename: 'Mutation',
						modifySignature: true
					},
					update: proxy => {
						const data = proxy.readQuery({ query: AccountInfoQuery });
						const signature = get(data, 'accountInfo.signatures.signature');
						const sign = signature.find(tempSign => id === tempSign.id);
						sign && (sign.content[0]._content = value);
						proxy.writeQuery({ query: AccountInfoQuery, data });
					}
				})
		})
	});
}

export function withCreateSignature() {
	return graphql(createSignature, {
		props: ({ mutate }) => ({
			createSignature: ({ contentType, name, value, account }) =>
				mutate({
					variables: {
						signature: {
							name,
							content: {
								type: contentType,
								_content: value
							}
						}
					},
					refetchQueries: [
						{
							query: AccountInfoQuery
						}
					],
					optimisticResponse: {
						__typename: 'Mutation',
						createSignature: {
							signature: {
								id: '',
								name,
								content: {
									type: contentType,
									_content: value,
									__typename: 'SignatureContent'
								},
								__typename: 'Signature'
							},
							__typename: 'Signatures'
						}
					},
					update: proxy => {
						const data = proxy.readQuery({ query: AccountInfoQuery });
						let signature = get(data, 'accountInfo.signatures.signature');
						signature = signature || [];
						signature.push({
							id: 'tempSignId',
							name,
							content: [
								{
									type: contentType,
									_content: value,
									__typename: 'SignatureContent'
								}
							],
							__typename: 'Signature'
						});
						if (!account.accountType) {
							const identities = get(data, 'accountInfo.identities');
							identities.identity[0]._attrs.zimbraPrefDefaultSignatureId = 'tempSignId';
							identities.identity[0]._attrs.zimbraPrefForwardReplySignatureId = 'tempSignId';
						} else {
							const dataSourceObj = get(data, `accountInfo.dataSources.${account.accountType}`);
							const externalAccount = dataSourceObj.find(dataObj => dataObj.id === account.id);
							externalAccount.defaultSignature = 'tempSignId';
							externalAccount.forwardReplySignature = 'tempSignId';
						}
						proxy.writeQuery({ query: AccountInfoQuery, data });
					}
				})
		})
	});
}

export function withDeleteSignature() {
	return graphql(deleteSignature, {
		props: ({ mutate }) => ({
			deleteSignature: ({ id }) =>
				mutate({
					variables: {
						signature: {
							id
						}
					},
					refetchQueries: [
						{
							query: AccountInfoQuery
						}
					],
					optimisticResponse: {
						__typename: 'Mutation',
						deleteSignature: true
					},
					update: proxy => {
						const data = proxy.readQuery({ query: AccountInfoQuery });
						const signature = get(data, 'accountInfo.signatures.signature');
						signature.find((sign, i) => sign.id === id && signature.splice(i, 1));
						proxy.writeQuery({ query: AccountInfoQuery, data });
					}
				})
		})
	});
}
