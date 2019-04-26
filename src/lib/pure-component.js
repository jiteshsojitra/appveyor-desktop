import { Component } from 'preact';

export function shallowEqual(a, b) {
	for (const i in a) if (a[i] !== b[i]) return false;
	for (const i in b) if (!(i in a)) return false;
	return true;
}

export function shouldComponentUpdate(props, state) {
	return !shallowEqual(props, this.props) || !shallowEqual(state, this.state);
}

// eslint-disable-next-line react/prefer-stateless-function
export default class PureComponent extends Component {}
PureComponent.prototype.shouldComponentUpdate = shouldComponentUpdate;
