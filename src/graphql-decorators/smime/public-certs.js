import { graphql, compose } from 'react-apollo';
import { getSMimePublicCertsQuery } from '../../graphql/queries/smime/public-certs.graphql';
import withAccountInfo from '../account-info';
import { isSMIMEFeatureAvailable } from '../../utils/license';
import get from 'lodash/get';

export function getSMimePublicCerts() {
	return compose(
		withAccountInfo(({ data: { accountInfo } }) => ({
			isSMimeFeatureEnabled: isSMIMEFeatureAvailable(accountInfo.license)
		})),
		graphql(getSMimePublicCertsQuery, {
			skip: ({ isSMimeFeatureEnabled, showCertBadge }) => !(isSMimeFeatureEnabled && showCertBadge),
			options: ({ contact }) => ({
				variables: {
					contactAddr: contact && contact.address
				}
			}),
			props: ({ data }) => ({
				publicCert: get(data, 'getSMimePublicCerts.certs.0.cert.0._content'),
				publicCertLoading: data.loading,
				publicCertError: data.error,
				refetchPublicCert: data.refetch
			})
		})
	);
}
