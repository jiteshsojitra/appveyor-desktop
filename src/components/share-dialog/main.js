import { h, Component } from 'preact';
import { withText, Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import linkstate from 'linkstate';
import get from 'lodash-es/get';
import cx from 'classnames';

import { getPublicGrant, getEmailGrants, addPublicGrant, removePublicGrant } from '../../utils/acl';
import toSentence from '../../utils/to-sentence';
import { parseAddress } from '../../lib/util';
import { notify as notifyActionCreator } from '../../store/notifications/actions';

import NakedButton from '../naked-button';
import FormGroup from '../form-group';
import ShareInfoCard from '../share-info-card';
import EmailShareInfoCard from './email-share-info-card';

import s from './style.less';

function grantName(grant) {
	if (grant.address) {
		return grant.address;
	}
	if (grant.zimbraId) {
		const parsed = parseAddress(grant.zimbraId);
		return parsed.name || parsed.address;
	}
	return '<Unknown User>';
}

const ShareList = ({ grants, onManage }) => (
	<div class={s.shareList}>
		<Text
			id="calendar.dialogs.share.sharedWith"
			fields={{
				grantees: toSentence(grants.map(grantName), { expandedLimit: 2 })
			}}
		/>
		<NakedButton onClick={onManage} linkColor>
			<Text id="buttons.change" />
		</NakedButton>
	</div>
);

@withText('calendar.dialogs.share.notifyCopy')
@connect(
	null,
	{ notify: notifyActionCreator }
)
export default class CalendarShareDialog extends Component {
	state = {
		enableEmail: false
	};

	handlePublicToggle = ({ target: { checked } }) => {
		const action = checked ? addPublicGrant : removePublicGrant;
		this.props.onACLChange(action(this.props.acl));
		this.setState({
			publicGrant: checked
		});
	};

	handleCopyLinkSuccess = () => {
		this.props.notify({
			message: this.props.notifyCopy
		});
	};

	componentWillMount() {
		const acl = getPublicGrant(this.props.acl);
		this.setState({
			enableEmail: this.props.emailGrants && this.props.emailGrants.length > 0,
			publicGrant: acl
		});
	}

	render(
		{
			accountInfoData,
			acl,
			aclEmails,
			publicURL,
			onManageAccess,
			emailsToInvite,
			invitePermissions,
			onEmailsToInviteChange,
			onInvitePermissionsChange
		},
		{ enableEmail, publicGrant }
	) {
		const emailGrants = getEmailGrants(acl);
		const isPublicSharingEnabled = get(
			accountInfoData,
			'accountInfo.attrs.zimbraPublicSharingEnabled'
		);
		return (
			<div>
				<FormGroup rows compact={!publicGrant}>
					<label class={cx(!isPublicSharingEnabled && s.disablePublicSharing)}>
						<ChoiceInput
							onChange={this.handlePublicToggle}
							checked={!!publicGrant}
							disabled={!isPublicSharingEnabled}
						/>{' '}
						<Text id="calendar.dialogs.share.enablePublicLabel" />
					</label>
					{publicGrant && (
						<ShareInfoCard
							title={<Text id="calendar.dialogs.share.publicSelectLabel" />}
							url={publicURL}
							onCopySuccess={this.handleCopyLinkSuccess}
						/>
					)}
				</FormGroup>
				<FormGroup rows compact={!enableEmail}>
					<label>
						<ChoiceInput
							onChange={linkstate(this, 'enableEmail')}
							checked={enableEmail}
							disabled={emailGrants && emailGrants.length > 0}
						/>{' '}
						<Text id="calendar.dialogs.share.inviteEmailsLabel" />
					</label>
					{enableEmail && (
						<div class={s.cardGroup}>
							<EmailShareInfoCard
								accountInfoData={accountInfoData}
								aclEmails={aclEmails}
								emailsToInvite={emailsToInvite}
								invitePermissions={invitePermissions}
								onEmailsToInviteChange={onEmailsToInviteChange}
								onInvitePermissionsChange={onInvitePermissionsChange}
							/>
							{emailGrants && emailGrants.length > 0 && (
								<ShareList grants={emailGrants} onManage={onManageAccess} />
							)}
						</div>
					)}
				</FormGroup>
			</div>
		);
	}
}
