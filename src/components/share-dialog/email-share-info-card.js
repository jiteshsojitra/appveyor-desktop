import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import includes from 'lodash/includes';
import get from 'lodash/get';
import { getEmail, isValidEmail } from '../../lib/util';

import ShareInfoCard from '../share-info-card';
import AddressField from '../address-field';
import PermissionsSelect from './permissions-select';

import s from './style.less';

@withText('calendar.dialogs.share.emailAddressesPlaceholder')
export default class EmailShareInfoCard extends Component {
	isCalendarAlreadySharedWithUser = email => includes(this.props.aclEmails, email);

	isEmailTokenSameAsOwner = email => get(this.props, 'accountInfoData.accountInfo.name') === email;

	isSelected = suggestion => {
		const email = getEmail(suggestion.email);
		return this.isCalendarAlreadySharedWithUser(email) || this.isEmailTokenSameAsOwner(email);
	};

	previouslySelectedLabel = suggestion => {
		const email = getEmail(suggestion.email);
		if (this.isCalendarAlreadySharedWithUser(email)) {
			return 'calendar.dialogs.share.addressFieldPreviouslySelected';
		} else if (this.isEmailTokenSameAsOwner(email)) {
			return 'calendar.dialogs.share.addressFieldOwner';
		}
	};

	validateToken = (address, token) => {
		const email = getEmail(token.address);
		return (
			isValidEmail(email) &&
			!this.isEmailTokenSameAsOwner(email) &&
			!this.isCalendarAlreadySharedWithUser(email)
		);
	};

	render({
		onEmailsToInviteChange,
		onInvitePermissionsChange,
		emailsToInvite,
		invitePermissions,
		emailAddressesPlaceholder
	}) {
		return (
			<ShareInfoCard
				title={
					<span>
						<Text id="calendar.dialogs.share.emailSelectLabel" />{' '}
						<PermissionsSelect
							value={invitePermissions}
							onChange={onInvitePermissionsChange}
							bold
							inline
							collapseLabel
							inlineArrow
						/>
					</span>
				}
			>
				<AddressField
					class={s.emailInput}
					placeholder={emailAddressesPlaceholder}
					value={emailsToInvite}
					onChange={onEmailsToInviteChange}
					wasPreviouslySelected={this.isSelected}
					previouslySelectedLabel={this.previouslySelectedLabel}
					validateToken={this.validateToken}
					formSize
				/>
			</ShareInfoCard>
		);
	}
}
