import { h, Component } from 'preact';
import { Localizer, Text } from 'preact-i18n';
import s from './style.less';

import { parseAddress } from '../../lib/util';

import Avatar from '../avatar';
import CloseButton from '../close-button';
import PermissionsSelect from './permissions-select';
import EmailShareInfoCard from './email-share-info-card';

class GrantRow extends Component {
	handleRemoveGrant = () => {
		this.props.onRemoveEmailGrant(this.props.grant);
	};

	handleChangePermissions = e => {
		this.props.onUpdateGrant({
			...this.props.grant,
			permissions: e.target.value
		});
	};

	render({ grant }) {
		const parsed = parseAddress(grant.address || grant.zimbraId);

		return (
			<tr class={s.accessTableRow}>
				<td>
					<div class={s.contactPreview}>
						<Avatar class={s.avatar} email={parsed.address} />
						<div>
							<div class={s.contactPreviewName}>{parsed.name}</div>
							<div class={s.contactPreviewAddress}>{parsed.address}</div>
						</div>
					</div>
				</td>
				<td>
					<PermissionsSelect
						granteeType={grant.granteeType}
						value={grant.permissions}
						onChange={this.handleChangePermissions}
					/>
				</td>
				<td>
					<Localizer>
						<CloseButton
							aria-label={<Text id="buttons.remove" />}
							onClick={this.handleRemoveGrant}
						/>
					</Localizer>
				</td>
			</tr>
		);
	}
}

const ShareAccessSettings = ({
	emailGrants,
	aclEmails,
	emailsToInvite,
	invitePermissions,
	onRemoveEmailGrant,
	onUpdateGrant,
	onEmailsToInviteChange,
	onInvitePermissionsChange
}) => (
	<div>
		<div class={s.sectionTitle}>
			<Text id="calendar.dialogs.share.accessSection" />
		</div>
		<div class={s.section}>
			<table class={s.accessTable}>
				{emailGrants.length ? (
					emailGrants.map(g => (
						<GrantRow
							grant={g}
							onRemoveEmailGrant={onRemoveEmailGrant}
							onUpdateGrant={onUpdateGrant}
						/>
					))
				) : (
					<tr>
						<td>
							<Text id="calendar.dialogs.share.noAccess" />
						</td>
					</tr>
				)}
			</table>
		</div>
		<div>
			<div class={s.sectionTitle}>
				<Text id="calendar.dialogs.share.inviteEmailsSection" />
			</div>
			<EmailShareInfoCard
				aclEmails={aclEmails}
				emailsToInvite={emailsToInvite}
				invitePermissions={invitePermissions}
				onEmailsToInviteChange={onEmailsToInviteChange}
				onInvitePermissionsChange={onInvitePermissionsChange}
			/>
		</div>
	</div>
);

export default ShareAccessSettings;
