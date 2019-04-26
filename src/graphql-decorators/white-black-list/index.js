import { graphql } from 'react-apollo';
import ModifyWhiteBlackListMutation from '../../graphql/mutations/modify-white-black-list-mutation.graphql';
import WhiteBlackListQuery from '../../graphql/queries/white-black-list.graphql';

export function updateWhiteBlackList() {
	return graphql(ModifyWhiteBlackListMutation, {
		props: ({ mutate }) => ({
			/**
			 * A function to update the blackList portion of the user's whiteBlackList
			 * A param of just an email array will replace the entire blackList,
			 * while an optional 'op' param will just modify the list
			 * @param {String[]} blackList	Array of email addresses
			 * @param {String} [op]			Optional operation, may be '+' (add) or '-' (remove)
			 */
			updateBlackList: (blackList, op) =>
				mutate({
					variables: {
						whiteBlackList: {
							blackList: {
								addr: blackList.map(email =>
									op
										? {
												_content: email,
												op
										  }
										: {
												_content: email
										  }
								)
							}
						}
					},
					refetchQueries: [
						{
							query: WhiteBlackListQuery
						}
					],
					optimisticResponse: {
						__typename: 'Mutation',
						modifyWhiteBlackList: true
					},
					update: cache => {
						try {
							const data = cache.readQuery({ query: WhiteBlackListQuery });
							let blackListArr = data.getWhiteBlackList.blackList[0].addr;

							if (op) {
								if (op === '+') {
									blackList.forEach(email => {
										blackListArr.push({
											_content: email,
											__typename: 'WhiteBlackAddress'
										});
									});
									cache.writeQuery({ query: WhiteBlackListQuery, data });
								}
								//TODO: eventually add support for removing addresses via context menu?
							} else {
								blackListArr = blackList.map(email => ({
									_content: email,
									__typename: 'WhiteBlackAddress'
								}));
								cache.writeQuery({ query: WhiteBlackListQuery, data });
							}
						} catch (e) {
							/*WhiteBlackListQuery has never been called, no reason to try to set cache*/
						}
					}
				})
		})
	});
}

export function whiteBlackList() {
	return graphql(WhiteBlackListQuery, {
		props: ({ data: { getWhiteBlackList } }) => ({ whiteBlackList: getWhiteBlackList })
	});
}
