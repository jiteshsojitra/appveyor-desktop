import { h, Component, cloneElement } from 'preact';

export default function withDialog(showHandler, renderDialog) {
	return BaseComponent =>
		class WithDialog extends Component {
			state = {
				showDialog: false
			};

			handleShow = () => {
				this.setState({ showDialog: true });
			};

			handleClose = () => {
				this.setState({ showDialog: false });
			};

			render() {
				const handler = { [showHandler]: this.handleShow };

				return (
					<div>
						<BaseComponent {...this.props} {...handler} />

						{this.state.showDialog &&
							cloneElement(renderDialog, {
								onClose: this.handleClose,
								closeDialog: this.handleClose,
								...this.props
							})}
					</div>
				);
			}
		};
}
