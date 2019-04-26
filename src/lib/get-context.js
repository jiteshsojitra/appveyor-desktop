import { h } from 'preact';

/**
 * A decorator that takes in a `mapContextToProps` function that runs given
 * context as its only argument and passes the result down as addtional props
 *
 * @param {Function} mapContextToProps
 * @returns {Function}
 */
export default mapContextToProps => Child => (props, context) =>
	h(Child, {
		...props,
		...mapContextToProps(context)
	});
