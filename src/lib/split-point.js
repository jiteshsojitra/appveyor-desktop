import { h, Component } from 'preact';

const FALLBACK = <div />;

export default function splitPoint(load, importName, fallbackContent) {
	return function SplitPointWrapper(props) {
		return (
			<SplitPoint
				load={load}
				importName={importName}
				fallbackContent={fallbackContent}
				{...props}
			/>
		);
	};
}

export class SplitPoint extends Component {
	componentWillMount() {
		const setChild = child => {
			if (this.props.importName) {
				child = child[this.props.importName] || child;
			}
			if (child && typeof child === 'object' && child.default) {
				child = child.default;
			}
			if (child !== this.state.child) {
				this.setState({ child });
			}
		};

		/**
		 * @param {Promise<ESModule> | Function<ESModule> | Function<Promise<ESModule>} load
		 */
		if (this.props.load.then) {
			// Support import() statements
			this.props.load.then(setChild);
		} else {
			// Support bundle-loader
			const ret = this.props.load(setChild);

			// Support bundle-loader `lazy=true`
			if (ret && ret.then) {
				ret.then(setChild);
			}
		}
	}

	render({ load, fallbackContent, ...props }, { child }) {
		return child ? h(child, props) : fallbackContent || FALLBACK;
	}
}
