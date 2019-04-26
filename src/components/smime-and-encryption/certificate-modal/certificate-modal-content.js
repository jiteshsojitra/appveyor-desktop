import { h } from 'preact';
import { Text } from 'preact-i18n';
import get from 'lodash-es/get';
import format from 'date-fns/format';

import style from './style';

export default function CertificateModalContent({ cert }) {
	const { notBefore: validFrom, notAfter: validTill, algorithm, serial } = cert;
	const { commonName, orgName, orgCountry, orgState, orgLocality, orgUnit } = get(cert, 'issuer');
	const {
		email,
		orgName: name,
		orgCountry: country,
		orgState: state,
		orgLocality: locality,
		orgUnit: unit
	} = get(cert, 'subject');

	const certificateSections = {
		issuedTo: {
			...(email && {
				email
			}),
			...(name && {
				name
			}),
			...(country && {
				country
			}),
			...(state && {
				state
			}),
			...(locality && {
				locality
			}),
			...(unit && {
				unit
			})
		},
		issuedBy: {
			...(commonName && {
				commonName
			}),
			...(orgName && {
				orgName
			}),
			...(orgCountry && {
				orgCountry
			}),
			...(orgState && {
				orgState
			}),
			...(orgLocality && {
				orgLocality
			}),
			...(orgUnit && {
				orgUnit
			})
		},
		validity: {
			...(validFrom && {
				beginsOn: format(validFrom, 'MMMM DD, YYYY')
			}),
			...(validTill && {
				[cert.isExpired ? 'endedOn' : 'endsOn']: format(validTill, 'MMMM DD, YYYY')
			})
		},
		signature: {
			...(serial && {
				serial: serial
					.toUpperCase()
					.replace(/(.{2})/g, '$1 ')
					.trim()
			}),
			...(algorithm && {
				algorithm
			})
		}
	};

	return (
		<div class={style.certInfoMainWrapper}>
			{Object.keys(certificateSections).map(sectionKey => {
				const sectionFields = certificateSections[sectionKey];
				const sectionFieldsKeys = Object.keys(sectionFields);

				return sectionFieldsKeys.length ? (
					<div class={style.section}>
						<strong class={style.title}>
							<Text id={`smime.certificateModal.${sectionKey}.title`} />
						</strong>
						<div class={style.certInfoWrapper}>
							{sectionFieldsKeys.map(fieldKey => (
								<div class={style.certInfo}>
									<div class={style.name}>
										<Text id={`smime.certificateModal.${sectionKey}.${fieldKey}`} />
									</div>
									<div class={style.val}>{sectionFields[fieldKey]}</div>
								</div>
							))}
						</div>
					</div>
				) : null;
			})}
		</div>
	);
}
