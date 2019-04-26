import { h, Component } from 'preact';
import cx from 'classnames';
import ModalDialog from '../modal-dialog';
import { Icon, Button, Spinner } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import { callWith } from '../../lib/util';
import { notify, clear } from '../../store/notifications/actions';
import linkref from 'linkref';
import DropzoneComponent from 'react-dropzone-component';
import 'react-dropzone-component/styles/filepicker.css';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import Avatar from '../avatar';

import style from './style';

const componentConfig = {
	showFiletypeIcon: false,
	postUrl: 'no-url'
};
const djsConfig = {
	autoProcessQueue: false,
	maxFiles: 1,
	acceptedFiles: 'image/png,image/gif,image/jpg,image/jpeg,image/svg,image/bmp'
};

const imageValidationCriterias = {
	maxWidth: 800,
	minWidth: 110,
	type: ['image/png', 'image/gif', 'image/jpg', 'image/jpeg', 'image/svg', 'image/bmp']
};

@connect(
	null,
	{ notify, clear }
)
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export class PhotoUploadModal extends Component {
	dropzoneComponent = null;

	eventHandlers = {
		init: dropzoneComponent => this.initDropzone(dropzoneComponent),
		addedfile: file => this.addedfile(file)
	};

	onSave = () => {
		this.setState({ loading: true });

		const { saveImage, onClose, notify: throwNotification } = this.props;

		if (saveImage) {
			const profileImage =
				this.state.croppedImage || this.refs.cropper.getCroppedCanvas().toDataURL();

			saveImage(profileImage)
				.then(() => {
					onClose();
				})
				.catch(() => {
					throwNotification({
						failure: true,
						message: <Text id="error.genericInvalidRequest" />
					});
				});
		} else {
			onClose();
		}
	};

	addedfile = file => {
		const reader = new FileReader();
		reader.readAsDataURL(file);

		reader.onloadend = () => {
			const img = new Image();
			img.onload = () => {
				if (img.width > imageValidationCriterias.maxWidth) {
					this.dropzoneComponent.createThumbnail.bind(this.dropzoneComponent)(
						file,
						imageValidationCriterias.maxWidth,
						null,
						'contain',
						false,
						(dataURL, canvas) => {
							if (canvas) {
								dataURL = canvas.toDataURL(file.type);
								this.updateCropperComponent(file, dataURL);
							}
						}
					);
				} else {
					this.updateCropperComponent(file, reader.result);
				}
			};
			img.src = reader.result;
		};
	};

	updateCropperComponent = (file, dataURL) => {
		const img = new Image();
		img.onload = () => {
			const validType = imageValidationCriterias.type.indexOf(file.type.toLowerCase()) > -1;
			const validMinWidth = img.width >= imageValidationCriterias.minWidth;

			if (validType && validMinWidth) {
				this.setState({
					valid: true,
					dataURL,
					width: img.width,
					height: img.height,
					size: file.size,
					type: file.type
				});

				this.dropzoneComponent.destroy();
			} else {
				this.setState({ valid: false });
				if (!validType) {
					this.props.notify({
						failure: true,
						message: <Text id="contacts.dialogs.uploadPhoto.errorType" />
					});
				}
				if (!validMinWidth) {
					this.props.notify({
						failure: true,
						message: <Text id="contacts.dialogs.uploadPhoto.errorMinWidth" />
					});
				}
				this.dropzoneComponent.removeFile(file);
			}
		};
		img.src = dataURL;
	};

	initDropzone = dropzoneComponent => (this.dropzoneComponent = dropzoneComponent);

	cropImageChange = () => {
		this.props.clear();
		const img = new Image();
		img.onload = () => {
			const validMaxWidth = imageValidationCriterias.maxWidth >= img.width;
			const validMinWidth = img.width >= imageValidationCriterias.minWidth;

			if (validMaxWidth && validMinWidth) {
				this.setState({
					croppedImage: this.refs.cropper.getCroppedCanvas().toDataURL(),
					valid: true
				});
			} else {
				this.setState({ valid: false });
				if (!validMaxWidth) {
					this.props.notify({
						failure: true,
						message: <Text id="contacts.dialogs.uploadPhoto.errorMaxWidth" />
					});
				}
				if (!validMinWidth) {
					this.props.notify({
						failure: true,
						message: <Text id="contacts.dialogs.uploadPhoto.errorMinWidth" />
					});
				}
			}
		};
		img.src = this.refs.cropper.getCroppedCanvas().toDataURL();
	};

	rotateImage = right => {
		this.refs.cropper.rotate(right ? 90 : -90);
		this.setState({ croppedImage: this.refs.cropper.getCroppedCanvas().toDataURL() });
	};

	removePhoto = () => {
		this.setState({
			dataURL: '',
			height: 0,
			width: 0,
			size: '',
			type: ''
		});
	};

	componentWillUnmount() {
		if (this.dropzoneComponent) this.dropzoneComponent.destroy();
	}

	render({ onClose, matchesScreenMd, imageURL }, { dataURL, valid, loading }) {
		let buttons = false;

		const showButtons = matchesScreenMd || (!matchesScreenMd && dataURL);

		if (showButtons) {
			buttons = [
				<Button
					styleType="primary"
					brand="primary"
					onClick={this.onSave}
					disabled={!dataURL || !valid || loading}
				>
					<Text id="buttons.save" />
					{loading && <Spinner block class={style.buttonspinner} />}
				</Button>
			];
			if (dataURL) {
				buttons.push(
					<Button onClick={this.removePhoto} disabled={loading}>
						<Text id="contacts.dialogs.uploadPhoto.removePhoto" />
					</Button>
				);
			}
		}
		return (
			<ModalDialog
				class={style.photoUploadModal}
				title="contacts.dialogs.uploadPhoto.dialogTitle"
				buttons={buttons}
				cancelButton={showButtons}
				cancelLabel="buttons.cancel"
				onClose={onClose}
				headerClass={style.headerModal}
				innerClass={cx(!matchesScreenMd && style.innerModal)}
				contentClass={style.contentModal}
				footerClass={cx(style.footerModal, showButtons && style.footerModalBorder)}
				disableOutsideClick
			>
				<div class={style.header}>
					{!dataURL ? (
						<Text id="contacts.dialogs.uploadPhoto.dragDropDescription" />
					) : (
						<Text id="contacts.dialogs.uploadPhoto.rotateDescription" />
					)}
				</div>
				{!dataURL ? (
					<div class={style.dragDropContainer}>
						<div class={style.dragDropBackground}>
							<Avatar class={style.thumbnail} profileImageURL={imageURL} />

							{matchesScreenMd ? (
								<Text id="contacts.dialogs.uploadPhoto.dragDropImage" />
							) : (
								<Text id="contacts.dialogs.uploadPhoto.dragDropImageMobile" />
							)}
						</div>
						<DropzoneComponent
							className={style.test}
							config={componentConfig}
							eventHandlers={this.eventHandlers}
							djsConfig={djsConfig}
						/>
					</div>
				) : (
					<div class={style.editImageContainer}>
						<Cropper
							ref={linkref(this, 'cropper')}
							src={dataURL}
							style={{
								height: matchesScreenMd ? 370 : '80%',
								width: '100%',
								'background-color': 'white',
								'margin-top': '20px'
							}}
							aspectRatio={1 / 1}
							guides={false}
							cropend={this.cropImageChange}
							ready={this.cropImageChange}
						/>
						<div class={style.cropperActionList}>
							<Text id="contacts.dialogs.uploadPhoto.rotateImage" />
							<Icon
								class={style.icon}
								name="rotate_left"
								onClick={callWith(this.rotateImage, true)}
							/>
							<Icon
								class={style.icon}
								name="rotate_right"
								onClick={callWith(this.rotateImage, false)}
							/>
						</div>
					</div>
				)}
			</ModalDialog>
		);
	}
}
