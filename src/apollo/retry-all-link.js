import { RetryLink } from 'apollo-link-retry';
import { ApolloLink } from 'apollo-link';

// Wrapper link to forward errors to the RetryLink
// See https://github.com/apollographql/apollo-link/issues/541#issuecomment-392166160
export default function RetryAllLink(config) {
	const retryLink = new RetryLink(config);

	return new ApolloLink((operation, forward) =>
		forward(operation).map(data => {
			if (data && data.errors && data.errors.length > 0) {
				retryLink.request(operation, forward);
			}
			return data;
		})
	);
}
