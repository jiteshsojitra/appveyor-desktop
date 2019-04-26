import { mapProps } from 'recompose';
import omit from 'lodash-es/omit';

export default function omitProps(keys) {
	if (typeof keys === 'string') {
		keys = keys.split(',');
	}
	return mapProps(props => omit(props, keys));
}
