import { graphql, compose } from 'react-apollo';
import getContext from '../lib/get-context';
import omitProps from '../enhancers/omit-props';
import LogoutMutation from '../graphql/queries/logout.graphql';
import { clearOfflineData } from '../utils/offline';

export default function withLogout({ name = 'logout' } = {}) {
	return compose(
		getContext(context => ({ context })),
		graphql(LogoutMutation, {
			props: ({ mutate, ownProps: { context } }) => ({
				[name]: (...args) =>
					mutate(...args)
						.catch(Object)
						.then(res => {
							clearOfflineData(context);
							return res;
						})
			})
		}),
		omitProps('context')
	);
}
