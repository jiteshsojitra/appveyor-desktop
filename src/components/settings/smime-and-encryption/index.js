import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import CertificateModal from '../../smime-and-encryption/certificate-modal';
import { callWith } from '../../../lib/util';
import smimeHandler from '@zimbra/electron-app/src/smime';
import { Icon, ChoiceInput } from '@zimbra/blocks';
import cx from 'classnames';
import style from '../style';
import { SMIME_OPERATIONS } from '../../../constants/smime';
import withNormalizedIdentitesAccountInfo from './../../../graphql-decorators/account-info/normalized-identities';

@withNormalizedIdentitesAccountInfo()
export default class SMimeAndEncryption extends Component {
	state = {
		certificates: [],
		selectedCert: null
	};

	handleOpenCertificateDialog = cert => {
		this.setState({
			selectedCert: cert
		});
	};

	handleCloseCertificateDialog = () => {
		this.setState({
			selectedCert: null
		});
	};

	componentDidMount() {
		const { accounts } = this.props;
		const allSMIMEPromises = [];

		accounts
			.map(account => account.emailAddress)
			.forEach(address => {
				allSMIMEPromises.push(
					smimeHandler({
						operation: 'get-ident',
						email: address,
						usage: 'sign'
					}).catch(() => {
						console.error(`get-ident failed for ${address} address`);

						// Eventhough we have got an error in fetching certificate but we will resolve it with empty data
						Promise.resolve();
					})
				);
			});

		Promise.all(allSMIMEPromises).then(values => {
			this.setState({
				certificates: values.filter(val => val && val.certificate)
			});
		});
	}

	componentWillUnmount() {
		this.setState({
			certificates: [],
			selectedCert: null
		});
	}

	render({ value, onFieldChange }, { certificates, selectedCert }) {
		return (
			<div class={style.smimeSection}>
				<div class={style.sectionTitle}>
					<Text id="settings.smimeAndEncryption.title" />
				</div>
				<div class={style.subsection}>
					<div class={style.subsectionTitle}>
						<Text id="settings.smimeAndEncryption.defaultSettings.title" />
					</div>
					<div class={style.helperText}>
						<Text id="settings.smimeAndEncryption.defaultSettings.subSectionTitle" />
					</div>
					<div class={style.subsectionBody}>
						<ul class={style.list}>
							{Object.keys(SMIME_OPERATIONS).map(key => (
								<li>
									<label>
										<ChoiceInput
											type="radio"
											name="smimeDefaultSettings"
											onChange={onFieldChange('zimbraPrefSMIMEDefaultSetting')}
											value={SMIME_OPERATIONS[key]}
											checked={SMIME_OPERATIONS[key] === value.zimbraPrefSMIMEDefaultSetting}
										/>
										<Text id={`settings.smimeAndEncryption.defaultSettings.options.${key}`} />
									</label>
								</li>
							))}
						</ul>
					</div>
				</div>
				{certificates && (
					<div class={style.subsection}>
						<div class={style.subsectionTitle}>
							<Text id="settings.smimeAndEncryption.certificates.title" />
						</div>
						{certificates.length ? (
							<div class={style.subsectionBody}>
								<ul class={cx(style.list, style.smimeCertificatesList)}>
									{certificates.map(cert => {
										const { name, email } = cert.certificate.subject;

										return (
											<li class={style.certificate}>
												<Icon
													class={cx(style.shieldIcon, !cert.isTrusted && style.viewCertError)}
													name={cert.isTrusted ? 'verified' : 'shield'}
												/>
												{name && (
													<span class={style.certAccount}>
														{name}&lt;{email}&gt;
													</span>
												)}
												{!name && <span class={style.certAccount}>{email}</span>}
												{cert.isTrusted && (
													<span
														class={style.viewCert}
														onClick={callWith(this.handleOpenCertificateDialog, cert)}
													>
														<Text id="buttons.view" />
													</span>
												)}
												{!cert.isTrusted && (
													<span class={style.viewCertError}>
														<Text id="settings.smimeAndEncryption.certificates.notTrusted" />
													</span>
												)}
											</li>
										);
									})}
								</ul>
							</div>
						) : (
							<div class={style.helperText}>
								<Text id="settings.smimeAndEncryption.certificates.notFoundText" />
							</div>
						)}
					</div>
				)}
				{selectedCert && (
					<CertificateModal
						cert={selectedCert.certificate}
						onClose={this.handleCloseCertificateDialog}
					/>
				)}
			</div>
		);
	}
}
