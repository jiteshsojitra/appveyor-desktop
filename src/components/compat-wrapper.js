import { createElement as h, Component } from 'react';

// When you want to compose a `recompose` Component together with a Preact component, you may encounter	https://github.com/acdlite/recompose/issues/458
// Put this after your `recompose` components to allow them to be compatible with Preact components.
export default function compatWrapper(Child) {
	// eslint-disable-next-line react/prefer-stateless-function
	return class CompatWrapper extends Component {
		render(props) {
			return <Child {...props} />;
		}
	};
}
