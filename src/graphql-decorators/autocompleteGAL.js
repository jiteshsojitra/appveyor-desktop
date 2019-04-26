import { AutoCompleteGAL } from '../graphql/queries/calendar/auto-complete-gal.graphql';
import { graphql } from 'react-apollo';

export default function withAutoCompleteGAL({
	queryAccessor = 'value',
	typeAccessor = 'type',
	...config
} = {}) {
	return graphql(AutoCompleteGAL, {
		options: props => ({
			context: {
				debounceKey: 'autoCompleteGAL'
			},
			variables: {
				name: props[queryAccessor],
				type: props[typeAccessor],
				needExp: true
			}
		}),
		...config
	});
}
