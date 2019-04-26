import { h, Component } from 'preact';
import { Button, Spinner } from '@zimbra/blocks';
import cx from 'classnames';
import style from './style.less';

export default class AnimatedButton extends Component {
	state = {
		shake: false,
		loading: false,
		disabled: false
	};

	setStateFromProps = props => {
		const { loading, shake, disabled } = props;

		this.setState({
			loading,
			shake,
			disabled
		});
	};

	componentWillMount() {
		this.setStateFromProps(this.props);
	}

	componentWillReceiveProps(nextProps) {
		const { shake } = this.state;
		const { afterShake } = this.props;

		if (nextProps.shake === true && shake !== nextProps.shake) {
			setTimeout(() => {
				this.setState({ shake: false });
				afterShake();
			}, 250);
		}

		this.setStateFromProps(nextProps);
	}

	render({ children, title, ...rest }, { loading, shake, disabled }) {
		title = title || (children && children.length && children);

		return (
			<Button {...rest} class={cx(shake && style.shakeHorizontal, rest.class)} disabled={disabled}>
				{title}
				{loading && <Spinner dark class={style.icon} />}
			</Button>
		);
	}
}
