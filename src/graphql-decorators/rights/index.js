import { graphql, compose } from 'react-apollo';
import uniqBy from 'lodash-es/uniqBy';
import get from 'lodash-es/get';
import GetRightsQuery from '../../graphql/queries/rights/get-rights-query.graphql';
import GrantRightsMutation from '../../graphql/queries/rights/grant-rights-mutation.graphql';
import RevokeRightsMutation from '../../graphql/queries/rights/revoke-rights-mutation.graphql';
import withSendRightsEmailNotifications from './email-notifications';

import { SEND_AS, SEND_ON_BEHALF } from '../../constants/rights';

export const getRightsInput = {
	input: {
		access: [{ right: SEND_AS }, { right: SEND_ON_BEHALF }]
	}
};

export function withGetRights() {
	return graphql(GetRightsQuery, {
		name: 'getRightsQuery',
		options: {
			variables: getRightsInput
		}
	});
}

export function withGrantRights() {
	return compose(
		withSendRightsEmailNotifications(),
		graphql(GrantRightsMutation, {
			props: ({ mutate, ownProps: { sendGrantRightsEmailNotification } }) => ({
				onGrantRights: (address, rights) => {
					const access = rights.map(right => ({
						granteeType: 'usr',
						right,
						address
					}));

					return mutate({
						variables: {
							input: {
								access
							}
						},
						refetchQueries: [
							{
								query: GetRightsQuery,
								variables: getRightsInput
							}
						],
						optimisticResponse: {
							grantRights: {
								__typename: 'Mutation',
								access: access.map(obj => ({ ...obj, __typename: 'AccountACEInfo' }))
							}
						},
						update: (cache, { data: optimisticResponse }) => {
							const { grantRights } = optimisticResponse;
							// Update results to `getRights`
							const data = cache.readQuery({
								query: GetRightsQuery,
								variables: getRightsInput
							});

							cache.writeQuery({
								query: GetRightsQuery,
								variables: getRightsInput,
								data: {
									...data,
									getRights: {
										...data.getRights,
										access: !data.getRights.access
											? grantRights.access
											: uniqBy(
													[...data.getRights.access, ...grantRights.access],
													({ address: existingAddress, right }) => `${existingAddress}-${right}`
											  )
									}
								}
							});
						}
					}).then(res => {
						const grantee = get(res, 'data.grantRights.access.0.address');
						if (grantee) {
							sendGrantRightsEmailNotification({
								grantee,
								rights
							});
						}

						return res;
					});
				}
			})
		})
	);
}

export function withRevokeRights() {
	return compose(
		withSendRightsEmailNotifications(),
		graphql(RevokeRightsMutation, {
			props: ({ mutate, ownProps: { sendRevokeRightsEmailNotification } }) => ({
				onRevokeRights: (address, rights) => {
					const access = rights.map(right => ({
						granteeType: 'usr',
						right,
						address
					}));

					return mutate({
						variables: {
							input: {
								access
							}
						},
						refetchQueries: [
							{
								query: GetRightsQuery,
								variables: getRightsInput
							}
						],
						optimisticResponse: {
							revokeRights: {
								__typename: 'Mutation',
								access: access.map(obj => ({ ...obj, __typename: 'AccountACEInfo' }))
							}
						},
						update: (cache, { data: { revokeRights } }) => {
							// Update results to `getRights`
							const data = cache.readQuery({
								query: GetRightsQuery,
								variables: getRightsInput
							});

							cache.writeQuery({
								query: GetRightsQuery,
								variables: getRightsInput,
								data: {
									...data,
									getRights: {
										__typename: 'GetRightsResponse',
										access: data.getRights.access.filter(
											({ address: existingAddress, right }) =>
												existingAddress !== address ||
												!revokeRights.access.find(
													({ right: revokedRight }) => right === revokedRight
												)
										)
									}
								}
							});
						}
					}).then(res => {
						const grantee = get(res, 'data.revokeRights.access.0.address');
						if (grantee) {
							sendRevokeRightsEmailNotification({
								grantee,
								rights
							});
						}

						return res;
					});
				}
			})
		})
	);
}

export function withRevokeAllRights() {
	return compose(
		withSendRightsEmailNotifications(),
		graphql(RevokeRightsMutation, {
			props: ({ mutate, ownProps: { sendRevokeRightsEmailNotification } }) => ({
				onRevokeAllRights: address => {
					const access = [SEND_AS, SEND_ON_BEHALF].map(right => ({
						granteeType: 'usr',
						right,
						address
					}));

					return mutate({
						variables: {
							input: {
								access
							}
						},
						optimisticResponse: {
							revokeRights: {
								__typename: 'Mutation',
								access: access.map(obj => ({ ...obj, __typename: 'AccountACEInfo' }))
							}
						},
						update: cache => {
							const data = cache.readQuery({
								query: GetRightsQuery,
								variables: getRightsInput
							});

							cache.writeQuery({
								query: GetRightsQuery,
								variables: getRightsInput,
								data: {
									getRights: {
										__typename: 'GetRightsResponse',
										access: !data.getRights.access
											? null
											: data.getRights.access.filter(
													({ address: existingAddress }) => existingAddress !== address
											  )
									}
								}
							});
						}
					}).then(res => {
						const grantee = get(res, 'data.revokeRights.access.0.address');
						if (grantee) {
							sendRevokeRightsEmailNotification({
								grantee,
								rights: [SEND_AS, SEND_ON_BEHALF]
							});
						}

						return res;
					});
				}
			})
		})
	);
}
