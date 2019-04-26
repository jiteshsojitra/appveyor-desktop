import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import chooseFiles from 'choose-files';
import get from 'lodash-es/get';
import { Icon } from '@zimbra/blocks';
import smimeHandler from '@zimbra/electron-app/src/smime';
import cx from 'classnames';
import NakedButton from '../../../naked-button';
import CertificateModal from '../../../smime-and-encryption/certificate-modal';
import { USER_CERTIFICATE } from '../fields';
import { CERT_FILE_MIME_TYPE, CERT_FILE_READ_STATUS } from '../../../../constants/smime';

import style from './style';

export class PublicCertificateEditSection extends Component {
	state = {
		publicCert: null,
		readStatus: null,
		showMoreCertDetails: false
	};

	onAddCertificate = () => {
		chooseFiles({ multiple: false }, this.addCertificate);
	};

	addCertificate = ([file]) => {
		const userEmail = get(this.props, 'contactAttrs.email');

		if (!userEmail) {
			this.setState({ readStatus: CERT_FILE_READ_STATUS.EMAIL_ADDRESS_MISSING });
			return;
		}

		if (file) {
			if (file.type === CERT_FILE_MIME_TYPE) {
				const reader = new FileReader();
				const { onAddCertificate } = this.props;

				reader.onloadend = () => {
					// Should remove text till base64. See: https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
					const encodedCertData = reader.result.replace(/^(.+);base64,/, '');
					const publicCertData = this.readContactPublicCert(encodedCertData);

					if (publicCertData) {
						publicCertData
							.then(({ certificate }) => this.validateContactPublicCert(certificate, userEmail))
							.then(isValid =>
								isValid
									? onAddCertificate({ [USER_CERTIFICATE]: encodedCertData, certEmail: userEmail })
									: this.setState({ readStatus: CERT_FILE_READ_STATUS.INVALID_CERT })
							)
							.catch(() => this.setState({ readStatus: CERT_FILE_READ_STATUS.CORRUPTED }));
					}
				};

				reader.readAsDataURL(file);
			} else {
				this.setState({ readStatus: CERT_FILE_READ_STATUS.INVALID_FILE });
			}
		} else {
			this.setState({ readStatus: null });
		}
	};

	removeCertificate = () => {
		this.setState({ readStatus: null }, this.props.onRemoveCertificate);
	};

	viewCertificate = e => {
		e.preventDefault();
		this.setState({
			showMoreCertDetails: true
		});
	};

	closeCertificate = () => {
		this.setState({
			showMoreCertDetails: false
		});
	};

	setContactPublicCert = ({ certificate, isExpired }) => {
		this.setState({
			publicCert: {
				...certificate,
				isCertificateExpired: isExpired
			}
		});
	};

	unsetContactPublicCert = () => {
		this.setState({ publicCert: null });
	};

	readContactPublicCert = certStr =>
		smimeHandler &&
		certStr &&
		smimeHandler({
			operation: 'get-cert',
			certData: certStr
		});

	validateContactPublicCert = (certificate, contactEmail) =>
		contactEmail === get(certificate, 'subject.email');

	readAndSetContactPublicCert = certStr => {
		const publicCertData = this.readContactPublicCert(certStr);

		if (publicCertData) {
			publicCertData.then(this.setContactPublicCert).catch(this.unsetContactPublicCert);
		} else {
			this.unsetContactPublicCert();
		}
	};

	componentDidMount() {
		this.readAndSetContactPublicCert(get(this.props, `contactAttrs.${USER_CERTIFICATE}`));
	}

	componentWillReceiveProps(nextProps) {
		const contactPublicCert = get(this.props, `contactAttrs.${USER_CERTIFICATE}`),
			nextContactPublicCert = get(nextProps, `contactAttrs.${USER_CERTIFICATE}`);

		if (contactPublicCert !== nextContactPublicCert) {
			this.readAndSetContactPublicCert(nextContactPublicCert);
		}
	}

	render({ title }, { publicCert, showMoreCertDetails, readStatus }) {
		return (
			<fieldset>
				<legend>{title}</legend>
				<div class={style.userCertSection}>
					{publicCert ? (
						<div class={style.userCertDetails}>
							<div class={style.userDetails}>
								<label class={cx(publicCert.isCertificateExpired && style.expiredCertLabel)}>
									<Icon size="sm" name="verified" class={style.smimePubCertShieldIcon} />
									<span>
										<Text
											id={`smime.certificate.${
												publicCert.isCertificateExpired ? 'expiredText' : 'verifiedText'
											}`}
										/>
									</span>
									<span>&lt;{get(publicCert, 'subject.email')}&gt;</span>
								</label>
							</div>
							<div class={style.buttonsContainer}>
								<div class={style.buttonDivider}>
									<NakedButton class={style.button} onClick={this.viewCertificate}>
										<Text id="buttons.view" />
									</NakedButton>
								</div>
								<div class={style.buttonDivider}>
									<NakedButton class={style.button} onClick={this.removeCertificate}>
										<Text id="buttons.remove" />
									</NakedButton>
								</div>
							</div>
							{showMoreCertDetails && (
								<CertificateModal cert={publicCert} onClose={this.closeCertificate} />
							)}
						</div>
					) : (
						<div class={style.userCertInputField}>
							{readStatus && (
								<label class={style.certReadErrStatusMsg}>
									<Text
										id={`smime.contacts.error.${
											readStatus === CERT_FILE_READ_STATUS.EMAIL_ADDRESS_MISSING
												? 'emailAddressMissing'
												: readStatus === CERT_FILE_READ_STATUS.INVALID_FILE
												? 'nonCertFile'
												: readStatus === CERT_FILE_READ_STATUS.INVALID_CERT
												? 'invalidCertFile'
												: readStatus === CERT_FILE_READ_STATUS.CORRUPTED
												? 'corruptedCertFile'
												: 'any'
										}`}
									/>
								</label>
							)}
							<label class={style.uploadCertBtn} onClick={this.onAddCertificate}>
								<Text id="buttons.addCertificate" />
							</label>
						</div>
					)}
				</div>
			</fieldset>
		);
	}
}
