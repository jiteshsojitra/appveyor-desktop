import { graphql } from 'react-apollo';
import LoginMutation from '../graphql/queries/login.graphql';

export default function withLogin({ name = 'login' } = {}) {
	return graphql(LoginMutation, {
		props: ({ mutate }) => ({
			[name]: variables => mutate({ variables })
		})
	});
}
