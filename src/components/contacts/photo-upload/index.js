import { h, Component } from 'preact';
import { Icon } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import style from './style';
import { PhotoUploadModal } from '../../photo-upload-modal';
import { configure } from '../../../config';
import { getAttachedImageUrl } from '../../../utils/contacts';
import Avatar from '../../avatar';
import { callWith } from '../../../lib/util';
import getContext from '../../../lib/get-context';
import { withProps } from 'recompose';
import get from 'lodash-es/get';

@getContext(({ zimbraBatchClient }) => ({ zimbraBatchClient }))
@configure('zimbraOrigin')
@withProps(({ contact, zimbraOrigin, zimbraBatchClient }) => ({
	imageURL: get(contact, 'attributes')
		? getAttachedImageUrl(contact, zimbraOrigin, zimbraBatchClient)
		: ''
}))
export class PhotoUpload extends Component {
	toggleDialog = showPhotoDialog => this.setState({ showPhotoDialog });

	render({ contact, saveImage, allowUpload, imageURL }, { showPhotoDialog }) {
		return (
			<div class={style.photoContainer}>
				<Avatar class={style.photoThumbnail} contact={contact} profileImageURL={imageURL} />

				{allowUpload && (
					<div class={style.photoOverlay} onClick={callWith(this.toggleDialog, true)}>
						<div class={style.photoOverlayContent}>
							<Icon class={style.photoOverlayIcon} name="camera" />
							<Text id="buttons.update" />
						</div>
					</div>
				)}

				{showPhotoDialog && (
					<PhotoUploadModal
						saveImage={saveImage}
						onClose={callWith(this.toggleDialog, false)}
						imageURL={imageURL}
					/>
				)}
			</div>
		);
	}
}
