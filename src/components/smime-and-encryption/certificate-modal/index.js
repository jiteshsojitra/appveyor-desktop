import { h } from 'preact';
import InlineModalDialog from '../../inline-modal-dialog';
import CertificateModalContent from './certificate-modal-content';

import style from './style';

export default function CertificateModal({ cert, onClose }) {
	return (
		<InlineModalDialog
			title="smime.certificateModal.title"
			dialogClassName={style.settings}
			innerClassName={style.certificateWrapper}
			showActionBtn={false}
			showCloseBtn={false}
			onClose={onClose}
		>
			<div>
				<CertificateModalContent cert={cert} />
			</div>
		</InlineModalDialog>
	);
}
