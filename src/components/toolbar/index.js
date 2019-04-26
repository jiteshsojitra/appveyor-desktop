import { h, Component } from 'preact';
import Portal from 'preact-portal';

import s from './style.less';
import cx from 'classnames';

export default class Toolbar extends Component {
	state = { mounted: false };

	componentDidMount() {
		// We encounter a duplicate mounting issue if we try to immediately render,
		// likely due portaling into a sibling component and mounting order.
		setTimeout(() => {
			this.setState({ mounted: true });
		}, 0);
	}

	render(props) {
		if (this.state.mounted) {
			return (
				<Portal into="#app-navigation-toolbar">
					<ToolbarContainer {...props} />
				</Portal>
			);
		}
	}
}

export function ToolbarContainer({ children, ...props }) {
	return (
		<div {...props} class={cx(s.toolbarContainer, props.class)}>
			<div class={s.toolbar}>{children}</div>
		</div>
	);
}
