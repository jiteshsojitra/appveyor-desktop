import { graphql } from 'react-apollo';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';

export default function withAccountInfo(mapProps = () => ({})) {
	return graphql(AccountInfoQuery, {
		props: result => ({
			account: result.data.accountInfo,
			accountLoading: result.data.loading,
			accountError: result.data.error,
			refetchAccount: result.data.refetch,
			...mapProps(result)
		})
	});
}
