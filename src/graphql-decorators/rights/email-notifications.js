/* eslint-disable new-cap */
import GrantedRights from '../../vhtml-components/calendar-delegation/granted-rights';
import { GRANTED, REVOKED } from '../../constants/rights';
import getContext from '../../lib/get-context';
import SendMessageMutation from '../../graphql/queries/send-message-mutation.graphql';
import withAccountInfo from '../../graphql-decorators/account-info';
import { graphql, compose } from 'react-apollo';
import { convertMessageToZimbra } from '../../graphql-decorators/send-message';
import get from 'lodash-es/get';

export default function withSendRightsEmailNotifications() {
	return compose(
		withAccountInfo(),
		getContext(context => ({
			template: get(context, 'intl.dictionary.vhtmlComponents.delegation')
		})),
		graphql(SendMessageMutation, {
			props: ({ mutate, ownProps }) => {
				function sendRightsEmailNotificationFactory(grantedOrRevoked) {
					const owner = get(ownProps, 'account.identities.identity.0._attrs.zimbraPrefFromAddress');
					const subject = get(ownProps, 'template.subject', '')
						.replace(/{{owner}}/, owner)
						.replace(/{{grantedOrRevoked}}/, grantedOrRevoked);

					return ({ grantee, rights }) =>
						mutate({
							variables: {
								message: convertMessageToZimbra({
									subject,
									from: [
										{
											address: owner
										}
									],
									to: [
										{
											address: grantee
										}
									],
									html: GrantedRights({
										template: ownProps.template,
										rights,
										grantee,
										owner,
										grantedOrRevoked
									})
								})
							}
						});
				}

				return {
					sendGrantRightsEmailNotification: sendRightsEmailNotificationFactory(GRANTED),
					sendRevokeRightsEmailNotification: sendRightsEmailNotificationFactory(REVOKED)
				};
			}
		})
	);
}
