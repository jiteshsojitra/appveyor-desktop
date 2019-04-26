import { h, Component } from 'preact';
import { Spinner, ModalDialog } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import BackArrow from '../back-arrow';
import { ToolbarContainer } from '../toolbar';
import style from './style';
import cx from 'classnames';

export default class ModalDrawer extends Component {
	handleClickOutside = () => {
		const { onClickOutside, preventCollapse } = this.props;
		if (onClickOutside) {
			if (!preventCollapse) {
				this.setState({ mounted: false });
			} // Match delay to animation duration in ./style.less
			setTimeout(onClickOutside, 250);
		}
	};

	componentDidMount() {
		this.setState({ mounted: true }); // eslint-disable-line react/no-did-mount-set-state
	}

	componentWillReceiveProps({ mounted }) {
		// To perform an animation before unmounting, pass down `mounted={false}`
		if (mounted === false) {
			this.handleClickOutside();
		}
	}

	render({ children, toolbar, pending, toolbarChildren, title, error, ...props }, { mounted }) {
		return (
			<ModalDialog
				{...props}
				onClickOutside={this.handleClickOutside}
				class={cx(style.modal, props.class)}
			>
				<div class={cx(style.container, !mounted && style.slideRight)}>
					{toolbar || (
						<ToolbarContainer>
							<BackArrow class={style.close} onClick={this.handleClickOutside} />
							{toolbarChildren}
						</ToolbarContainer>
					)}
					{title && (
						<header class={style.header}>
							<h2>
								<Text id={title}>{title}</Text>
							</h2>
						</header>
					)}
					{error && <div class={cx(style.error)}>{error}</div>}
					{children}
				</div>

				{pending && <Spinner class={style.spinner} block />}
			</ModalDialog>
		);
	}
}
