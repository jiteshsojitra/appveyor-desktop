import { h, Component } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import { connect } from 'preact-redux';
import get from 'lodash-es/get';
import clipboard from 'clipboard-polyfill';
import { USER_FOLDER_IDS } from '../../constants';

import { notify } from '../../store/notifications/actions';

import ActionMenu, { DropDownWrapper } from '../action-menu';
import { withCreateContact } from '../../graphql-decorators/contact';
import ActionMenuItem from '../action-menu-item';
import ActionMenuGroup from '../action-menu-group';
import s from './style.less';

@connect(
	state => ({
		isOffline: get(state, 'network.isOffline')
	}),
	{ notify }
)
@withCreateContact()
export default class ContactCardMenu extends Component {
	state = {
		showEditModal: false
	};

	copy(text) {
		clipboard.writeText(text).then(() => {
			this.props.notify({
				message: <Text id="contacts.hoverCard.COPIED_TOAST" />
			});
		});
	}

	handleCopyAddress = () => {
		this.copy(this.props.email);
	};

	handleCopyDetails = () => {
		const { name, email, jobDescription, phone } = this.props;

		this.copy([name, jobDescription, email, phone].filter(Boolean).join('\n'));
	};

	toggleEditModal = () => {
		const { toggleEditModal } = this.props;
		typeof toggleEditModal === 'function' && toggleEditModal();
	};

	addToContacts = () => {
		const { name, email, createContact, notify: notifyAction } = this.props;
		const [firstName = '', lastName = ''] = name.split(' ');
		createContact({
			attributes: { fullName: name, firstName, lastName, email },
			folderId: USER_FOLDER_IDS.CONTACTS
		}).then(() => {
			notifyAction({
				message: (
					<Text id="actions.toasts.addSenderToContacts.message.one" fields={{ address: email }} />
				)
			});
		});
	};

	toggleActionMenu = active => {
		const { toggleActionMenu } = this.props;
		typeof toggleActionMenu === 'function' && toggleActionMenu(active);
	};

	render({ enableEdit, isOffline }) {
		return (
			<div>
				<Localizer>
					<ActionMenu
						class={s.actionMenu}
						actionButtonClass={s.menuButton}
						popoverClass={s.menu}
						corners="all"
						icon="ellipsis-h"
						iconSize="md"
						arrow={false}
						onToggle={this.toggleActionMenu}
						monotone
						iconOnly
					>
						<DropDownWrapper>
							<ActionMenuGroup>
								{enableEdit ? (
									<ActionMenuItem onClick={this.toggleEditModal} disabled={isOffline}>
										<Text id="contacts.hoverCard.EDIT" />
									</ActionMenuItem>
								) : (
									<ActionMenuItem onClick={this.addToContacts} disabled={isOffline}>
										<Text id="contacts.hoverCard.ADD" />
									</ActionMenuItem>
								)}
								<ActionMenuItem onClick={this.handleCopyAddress}>
									<Text id="contacts.hoverCard.COPY_ADDRESS" />
								</ActionMenuItem>
								<ActionMenuItem onClick={this.handleCopyDetails}>
									<Text id="contacts.hoverCard.COPY_DETAILS" />
								</ActionMenuItem>
							</ActionMenuGroup>
						</DropDownWrapper>
					</ActionMenu>
				</Localizer>
			</div>
		);
	}
}
