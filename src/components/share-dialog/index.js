import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import linkstate from 'linkstate';
import cloneDeep from 'lodash/cloneDeep';
import isPlainObject from 'lodash/isPlainObject';
import get from 'lodash/get';
import { connect } from 'preact-redux';

import { getEmail, isValidEmail } from '../../lib/util';
import { getEmailGrants, removeEmailGrant, addEmailGrants, updateGrant } from '../../utils/acl';

import ModalDialog from '../modal-dialog';
import ShareMain from './main';
import ShareAccessSettings from './access-settings';

import { notify as notifyActionCreator } from '../../store/notifications/actions';

function publicURL(calendar, accountInfoData) {
	return accountInfoData.accountInfo
		? `${accountInfoData.accountInfo.rest}/${encodeURIComponent(
				calendar.absFolderPath.replace('/', '')
		  )}.html`
		: '';
}

function calendarAlreadySharedWithUser(acl, email) {
	acl = acl || [];
	return acl.find(elem => elem.address === email);
}

@connect(
	null,
	{
		notify: notifyActionCreator
	}
)
export default class CalendarShareDialog extends Component {
	state = {
		acl: null,
		showAccessSettings: false,
		emailsToInvite: [],
		invitePermissions: 'r',
		enableLinks: false
		// error: null
	};

	aclWithNewInvites = () => {
		const { accountInfoData } = this.props;
		const { acl, emailsToInvite, invitePermissions } = this.state;

		const emails = emailsToInvite.filter(c => isValidEmail(c.address)).map(c => c.address);
		return addEmailGrants(acl, emails, invitePermissions, accountInfoData.accountInfo.publicURL);
	};

	handleACLChange = nextACL => {
		this.setState({
			acl: nextACL
		});
	};

	handleRemoveEmailGrant = grant => {
		this.setState({
			acl: removeEmailGrant(this.state.acl, grant)
		});
	};

	handleUpdateGrant = nextGrant => {
		this.setState({
			acl: updateGrant(this.state.acl, nextGrant)
		});
	};

	handleEmailsToInviteChange = e => {
		this.handleErrorOnEmailsToInvite(e.value);
		this.setState({ emailsToInvite: e.value });
	};

	handleErrorOnEmailsToInvite = emailsToInvite => {
		const errors = new Set();
		const aclGrant = get(this.state, 'acl.grant');
		const ownerEmail = get(this.props, 'accountInfoData.accountInfo.name');

		if (emailsToInvite && emailsToInvite.length > 0) {
			for (const emailToken of emailsToInvite) {
				// emailsToInvite contain a string as the last entry of the array until the pill has been created
				if (isPlainObject(emailToken)) {
					const email = getEmail(emailToken.address);

					if (!isValidEmail(email)) {
						errors.add('calendar.sidebar.notifications.errors.invalidEmail');
					} else if (calendarAlreadySharedWithUser(aclGrant, email)) {
						errors.add('calendar.sidebar.notifications.errors.calendarAlreadyShared');
					} else if (ownerEmail === email) {
						errors.add('calendar.sidebar.notifications.errors.cannotShareWithSelf');
					}
				}
			}
		}

		this.setState({
			error:
				errors && errors.size > 0 ? (
					<div>
						{Array.from(errors).map(error => (
							<div>
								<Text id={error} />
							</div>
						))}
					</div>
				) : null
		});
	};

	handleToggleAccessSettings = () => {
		this.setState({ showAccessSettings: !this.state.showAccessSettings });
	};

	handleSave = () => {
		const acl = this.aclWithNewInvites();

		this.setState({ pendingSave: true });
		this.props
			.onUpdateACL(this.props.calendar, acl)
			.then(() => {
				if (this.state.emailsToInvite.length > 0) {
					const emailsToInviteLength = this.state.emailsToInvite.filter(c =>
						isValidEmail(c.address)
					).length;

					this.props.notify({
						message: (
							<Text
								id="calendar.sidebar.notifications.calendarShared"
								plural={emailsToInviteLength}
								fields={{ count: emailsToInviteLength }}
							/>
						)
					});
				}

				this.setState({
					pendingSave: false,
					emailsToInvite: []
				});

				// close the modal dialog on successful save
				this.props.closeDialog();
			})
			.catch(e => {
				this.props.notify({
					failure: true,
					message: /cannot grant access to the owner of the item/.test(e.message) ? (
						<Text id="calendar.sidebar.notifications.errors.cannotShareWithSelf" />
					) : (
						<Text id="error.genericInvalidRequest" />
					)
				});
				this.setState({ pendingSave: false });
			});
	};

	update(props) {
		let { acl } = this.state;

		if (!acl) {
			acl = props.calendar.acl
				? cloneDeep({
						...props.calendar.acl,
						grant: props.calendar.acl.grant || []
				  })
				: { grant: [] };

			this.setState({ acl });
		}
	}

	componentWillMount() {
		this.update(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.update(nextProps);
	}

	render(
		{ calendar, accountInfoData, onClose },
		{ acl, showAccessSettings, pendingSave, emailsToInvite, invitePermissions, error }
	) {
		const emailGrants = getEmailGrants(acl);
		const aclEmails = emailGrants.map(g => getEmail(g.address || g.zimbraId));
		const enableEmail = emailGrants && emailGrants.length > 0;

		return (
			<ModalDialog
				title={
					showAccessSettings ? (
						<Text id="calendar.dialogs.share.settingsTitle" />
					) : (
						<Text id="calendar.dialogs.share.title" fields={{ name: calendar.name }} />
					)
				}
				onAction={this.handleSave}
				onClose={onClose}
				actionLabel="buttons.save"
				cancelLabel="buttons.close"
				pending={pendingSave}
				disableEscape
				error={error}
				disablePrimary={!!error}
			>
				{showAccessSettings ? (
					<ShareAccessSettings
						aclEmails={aclEmails}
						emailGrants={emailGrants}
						emailsToInvite={emailsToInvite}
						invitePermissions={invitePermissions}
						onEmailsToInviteChange={this.handleEmailsToInviteChange}
						onInvitePermissionsChange={linkstate(this, 'invitePermissions')}
						onRemoveEmailGrant={this.handleRemoveEmailGrant}
						onUpdateGrant={this.handleUpdateGrant}
					/>
				) : (
					<ShareMain
						accountInfoData={accountInfoData}
						acl={acl}
						aclEmails={aclEmails}
						emailGrants={emailGrants}
						emailsToInvite={emailsToInvite}
						invitePermissions={invitePermissions}
						enableEmail={enableEmail}
						onACLChange={this.handleACLChange}
						onEmailsToInviteChange={this.handleEmailsToInviteChange}
						onInvitePermissionsChange={linkstate(this, 'invitePermissions')}
						onManageAccess={this.handleToggleAccessSettings}
						publicURL={publicURL(calendar, accountInfoData)}
					/>
				)}
			</ModalDialog>
		);
	}
}
