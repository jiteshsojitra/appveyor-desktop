import { HttpLink } from 'apollo-link-http';

export default function GraphQLServerLink({ zimbraOrigin, zimbraGraphQLEndPoint } = {}) {
	const origin = zimbraOrigin || '/@zimbra';
	const graphqlEndPoint = zimbraGraphQLEndPoint || '/service/extension/graphql';

	return new HttpLink({
		uri: `${origin}${graphqlEndPoint}`,
		credentials: 'same-origin', // We need this to send cookies in the request by browser as we are using cookies for graphql authentication.
		headers: {
			// ideally we should not need this content type set here, but graphql api end point
			// returns 500 when we do not send this (which defaults to application/json)
			'content-type': 'text/plain;charset=UTF-8'
		}
	});
}
