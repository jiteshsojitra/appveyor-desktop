import { h, Component } from 'preact';

export default function withMediaQuery(mq, propName = 'matchesMediaQuery') {
	if (!window.matchMedia) {
		console.error('window.matchMedia is unsupported.');
		return BaseComponent => BaseComponent;
	}

	return BaseComponent =>
		class WithMediaQuery extends Component {
			state = {
				matchesMediaQuery: window.matchMedia(mq).matches
			};

			handleMediaQueryChange = e => {
				this.setState({ matchesMediaQuery: e.matches });
			};

			componentDidMount() {
				this.mediaQuery = window.matchMedia(mq);
				this.mediaQuery.addListener(this.handleMediaQueryChange);
			}

			componentWillUnmount() {
				if (this.mediaQuery) {
					this.mediaQuery.removeListener(this.handleMediaQueryChange);
				}
			}

			render(props, { matchesMediaQuery }) {
				return <BaseComponent {...props} {...{ [propName]: matchesMediaQuery }} />;
			}
		};
}
