/* eslint preact-i18n/no-text-as-children: [off] */

import { h, Component } from 'preact';

/** Renders a zimlet-connected slot.
 *  @param props
 *  @param {string} props.name					The named slot to render content for
 *  @param {Array<Function>} [props.children]	If a function is passed as a child, it will be passed the slot content as an Array.
 *  @param {Object} [props.props]				Normally, remaining props are forwarded to the wrapping <span> by default. Nesting an object under`props` explicitly allows passing `name` and `children` if needed.
 */
export default class ZimletSlot extends Component {
	maybeUpdate = name => {
		if (name === 'slot::' + this.props.name) {
			this.setState({});
		}
	};

	getChildren(name, props) {
		const results = this.context.zimlets.invokePlugin('slot::' + name, props);
		if (results) {
			for (let i = results.length; i--; ) {
				if (typeof results[i] === 'function') {
					results[i] = h(results[i], props);
				}
			}
		}
		return results;
	}

	componentDidMount() {
		this.context.zimlets.on('plugins::changed', this.maybeUpdate);
	}

	componentWillUnmount() {
		this.context.zimlets.off('plugins::changed', this.maybeUpdate);
	}

	render({ name, props, children, ...allProps }, state, { zimlets }) {
		const results = this.getChildren(name, props || allProps);
		if (typeof children[0] === 'function') {
			if (zimlets.showZimletSlots) {
				//eslint-disable-next-line no-console
				console.log(`non-visible ZimletSlot name=${name}`);
			}
			return children[0](results);
		}
		return (
			<span {...(props ? allProps : {})}>
				{zimlets.showZimletSlots && (
					<span style="position: absolute; background: rgba(228,147,51,.5); border: 2px solid red; padding: 2px; font-weight: 700; font-size: 12px;">
						ZimletSlot name={name}
					</span>
				)}
				{results}
			</span>
		);
	}
}
