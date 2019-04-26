import { graphql } from 'react-apollo';
import GetShareInfoFolder from '../../graphql/queries/shares/share-infos.graphql';

export default function withGetShareInfo({ variables = {}, ...config } = {}) {
	return graphql(GetShareInfoFolder, {
		options: {
			variables: {
				includeSelf: false,
				...variables
			}
		},
		props: ({ data: { shareInfo } }) => ({
			shareInfo
		}),
		...config
	});
}
