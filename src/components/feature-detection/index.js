import { cloneElement } from 'preact';
import { graphql } from 'react-apollo';
import get from 'lodash/get';

import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';

const FeatureDetection = ({ children, enabled }) =>
	enabled ? children && children[0] && cloneElement(children[0]) : null;

/**
 * <FeatureDetection feature="zimbraFeatureRelatedContactsEnabled">
 * 	I'm enabled!
 * <FeatureDetection>
 */
export default graphql(AccountInfoQuery, {
	props: ({ ownProps: { feature }, data: { accountInfo } }) => ({
		enabled: Boolean(get(accountInfo, `attrs.${feature}`))
	})
})(FeatureDetection);
