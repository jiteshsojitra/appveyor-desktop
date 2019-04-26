import { AutoComplete } from '../graphql/queries/contacts/auto-complete.graphql';
import { graphql } from 'react-apollo';

export default function withAutoComplete({
	queryAccessor = 'value',
	resultAccessor = 'contactSuggestions'
} = {}) {
	return graphql(AutoComplete, {
		// TODO: Consider debouncing
		skip: ({ disableContactSuggestions, ...props }) =>
			disableContactSuggestions ||
			!props[queryAccessor] ||
			props[queryAccessor].length < 3 ||
			props.isLocation,
		options: props => ({
			context: {
				debounceKey: 'autoComplete'
			},
			variables: {
				name: props[queryAccessor]
			}
		}),
		props: ({ data }) => ({
			[resultAccessor]:
				data.loading || !data.autoComplete || !data.autoComplete.match
					? []
					: data.autoComplete.match
		})
	});
}
