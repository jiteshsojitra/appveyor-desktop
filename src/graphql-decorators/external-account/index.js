import { graphql } from 'react-apollo';
import { compose } from 'recompose';
import get from 'lodash-es/get';

import withNormalizedIdentitesAccountInfo from '../account-info/normalized-identities';

import TestExternalAccountMutation from '../../graphql/queries/accounts/account-test-external-mutation.graphql';
import AddExternalAccountMutation from '../../graphql/queries/accounts/account-add-external-mutation.graphql';
import ModifyExternalAccountMutation from '../../graphql/queries/accounts/account-modify-external-mutation.graphql';
import ImportExternalAccountMutation from '../../graphql/queries/accounts/account-import-external-mutation.graphql';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';

export function withTestExternalAccount() {
	return graphql(TestExternalAccountMutation, {
		props: ({ mutate }) => ({
			testExternalAccount: externalAccount =>
				mutate({
					variables: { externalAccount }
				})
		})
	});
}

export function withAddExternalAccount() {
	return graphql(AddExternalAccountMutation, {
		props: ({ mutate }) => ({
			addExternalAccount: externalAccount =>
				mutate({
					variables: { externalAccount },
					refetchQueries: [
						{ query: AccountInfoQuery },
						{ query: GetFolder, variables: { view: null } }
					]
				})
		})
	});
}

export function withModifyExternalAccount() {
	return compose(
		withNormalizedIdentitesAccountInfo(),
		graphql(ModifyExternalAccountMutation, {
			props: ({ ownProps: { denormalizeDataSource }, mutate }) => ({
				modifyExternalAccount: dataSource =>
					mutate({
						variables: {
							id: dataSource.id,
							type: dataSource.accountType,
							attrs: denormalizeDataSource(dataSource)
						},
						refetchQueries: [{ query: AccountInfoQuery }],
						optimisticResponse: {
							__typename: 'Mutation',
							modifyExternalAccount: true
						},
						update: proxy => {
							const data = proxy.readQuery({ query: AccountInfoQuery });

							const dataSources = get(data, `accountInfo.dataSources.${dataSource.accountType}`);
							let dataSourceObj = dataSources.find(dataObj => dataObj.id === dataSource.id);
							dataSourceObj && (dataSourceObj = dataSource);

							proxy.writeQuery({ query: AccountInfoQuery, data });
						}
					})
			})
		})
	);
}

export function withImportExternalAccountData() {
	return graphql(ImportExternalAccountMutation, {
		props: ({ mutate }) => ({
			importExternalAccount: externalAccount =>
				mutate({
					variables: { externalAccount }
				})
		})
	});
}
