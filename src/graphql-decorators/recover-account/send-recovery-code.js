import { graphql } from 'react-apollo';
import SendRecoveryCode from '../../graphql/queries/recover-account/send-recovery-code.graphql';

export default function withSendRecoveryCode() {
	return graphql(SendRecoveryCode, {
		props: ({ mutate }) => ({
			sendCode: email =>
				mutate({
					variables: {
						email
					}
				})
		})
	});
}
