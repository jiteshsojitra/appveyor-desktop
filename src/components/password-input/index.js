import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import linkref from 'linkref';
import style from './style';

export default class PasswordInput extends Component {
	state = {
		showPass: false
	};

	handleClickToggle = () => {
		this.setState({ showPass: !this.state.showPass });
	};

	componentDidMount() {
		if (this.props.autofocus) {
			this.refs.input.focus();
		}
	}

	render({ autofocus, ...props }, { showPass }) {
		return (
			<span class={style.container}>
				<input
					ref={linkref(this, 'input')}
					maxlength={64}
					{...props}
					type={showPass ? 'text' : 'password'}
				/>

				<button type="button" onClick={this.handleClickToggle}>
					<Text id={`buttons.${showPass ? 'hide' : 'show'}`} />
				</button>
			</span>
		);
	}
}
