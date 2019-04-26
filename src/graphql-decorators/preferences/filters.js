import { graphql } from 'react-apollo';

import GetFilterRules from '../../graphql/queries/preferences/filters.graphql';
import modifyFilterRules from '../../graphql/queries/preferences/modify-filters.graphql';
import { cloneWithoutTypeName } from '../../graphql/utils/graphql';

export function withFilters() {
	return graphql(GetFilterRules, {
		props: ({ data: { getFilterRules, loading, error } }) => ({
			filters: {
				// __typename keys are coming in data which is creating issues in modifyFilterRules mutation
				// so we are removing it here
				// Graphql always provides data as null for empty properties, but filter related code works
				// on existance of keys in response data so it fails, changing that code would be too complicated at this moment
				// so removing all null values here itself
				data: getFilterRules && cloneWithoutTypeName(getFilterRules),
				error,
				loading
			}
		})
	});
}

export function withModifyFilters() {
	return graphql(modifyFilterRules, {
		props: ({ mutate }) => ({
			modifyFilterRules: filters =>
				mutate({
					variables: {
						filters
					},
					refetchQueries: [
						{
							query: GetFilterRules
						}
					]
				})
		})
	});
}
