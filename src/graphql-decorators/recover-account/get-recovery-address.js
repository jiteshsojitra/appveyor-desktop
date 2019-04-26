import { graphql } from 'react-apollo';
import GetRecoveryAddress from '../../graphql/queries/recover-account/get-recovery-address.graphql';

export default function withGetRecoveryAddress() {
	return graphql(GetRecoveryAddress, {
		options: ({ email }) => ({
			errorPolicy: 'ignore',
			variables: { email }
		}),
		props: ({ data }) => {
			const { recoverAccount, error, loading } = data;
			if (!recoverAccount) return { error, loading };

			return {
				account: recoverAccount.recoveryAccount,
				attempts: recoverAccount.recoveryAttemptsLeft,
				error,
				loading
			};
		}
	});
}
