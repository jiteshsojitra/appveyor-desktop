import { h, Component } from 'preact';
import { callWith } from '../../lib/util';
import { Icon, ModalDialog } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import { compose, withProps } from 'recompose';
import { toggle as toggleSettings } from '../../store/settings/actions';
import { toggle as toggleAbout } from '../../store/about/actions';
import { hide as hideSidebar } from '../../store/sidebar/actions';
import { Text } from 'preact-i18n';
import ActionMenuItem from '../action-menu-item';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuSettings from '../action-menu-settings';
import withMediaQuery from '../../enhancers/with-media-query/index';
import { notify } from '../../store/notifications/actions';
import { minWidth, screenMd } from '../../constants/breakpoints';
import Login from '../login';
import { configure } from '../../config';
import withAccountInfo from '../../graphql-decorators/account-info';
import withLogout from '../../graphql-decorators/logout';
import { PhotoUploadModal } from '../photo-upload-modal';
import { graphql } from 'react-apollo';
import ModifyProfileImageMutation from '../../graphql/queries/accounts/modify-profile-image.graphql';
import { clearOfflineData } from '../../utils/offline';
import AppActions from '@zimbra/electron-app/src/actions';
import Avatar from '../avatar';
import gql from 'graphql-tag';
import wire from 'wiretie';
import s from './style.less';

import getContext from '../../lib/get-context';
import { LanguageModal } from '../language-modal';
import { withModifyPrefs } from '../../graphql-decorators/preferences';

const profileImageFragment = gql`
	fragment profileImageInfo on AccountInfo {
		profileImageId
	}
`;
@configure('zimbraOrigin')
@getContext(({ zimbraBatchClient }) => ({ zimbraBatchClient }))
@compose(
	withMediaQuery(minWidth(screenMd), 'matchesScreenMd'),
	withLogout(),
	withAccountInfo(
		({
			data: {
				accountInfo: {
					name,
					id,
					profileImageId,
					attrs: { displayName, zimbraFeatureChangePasswordEnabled },
					prefs: { zimbraPrefLocale }
				}
			}
		}) => ({
			userName: name,
			displayName,
			profileImageId,
			zimbraFeatureChangePasswordEnabled,
			zimbraPrefLocale,
			id
		})
	),
	withProps(({ displayName, userName, zimbraBatchClient, profileImageId }) => ({
		name: displayName ? displayName.split(' ')[0] : userName.split('@')[0],
		imageURL: zimbraBatchClient.getProfileImageUrl(profileImageId)
	})),
	connect(
		state => ({
			isOffline: state.network.isOffline
		}),
		(dispatch, { matchesScreenMd }) => ({
			toggleSettings: () => {
				dispatch(toggleSettings());
				if (!matchesScreenMd) {
					dispatch(hideSidebar());
				}
			},
			toggleAbout: () => {
				dispatch(toggleAbout());
			},
			notify: options => dispatch(notify(options))
		})
	)
)
@wire('zimbra', {}, zimbra => ({
	attach: zimbra.attachment.upload
}))
@withModifyPrefs()
@graphql(ModifyProfileImageMutation, {
	props: ({ mutate, ownProps: { id } }) => ({
		modifyProfileImage: variables =>
			mutate({
				variables,
				update: (
					proxy,
					{
						data: {
							modifyProfileImage: { itemId }
						}
					}
				) => {
					const profileImageData = proxy.readFragment({
						id: `AccountInfo:${id}`,
						fragment: profileImageFragment
					});

					profileImageData.profileImageId = itemId;

					proxy.writeFragment({
						id: `AccountInfo:${id}`,
						fragment: profileImageFragment,
						data: profileImageData
					});
				}
			})
	})
})
export default class HeaderActions extends Component {
	logoutUser = () => {
		this.props.logout().then(() => {
			window.location.href = '/';
		});
	};

	handleLogout = () => {
		if (this.props.isOffline && typeof process.env.ELECTRON_ENV !== 'undefined') {
			clearOfflineData(this.context);
			this.logoutUser();
			// Delayed closeApp execution to add logout request in offlineQueueLink
			setTimeout(() => {
				AppActions.closeApp && AppActions.closeApp();
			}, 1000);
			return;
		}
		this.logoutUser();
	};

	toggleModal = ({ modalState, status }) => {
		const { matchesScreenMd, closeSidebar } = this.props;
		status && !matchesScreenMd && closeSidebar && closeSidebar();
		this.setState({ [modalState]: status });
	};

	saveImage = imageData => {
		const re = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/gi;
		const result = re.exec(imageData);
		const { modifyProfileImage } = this.props;

		return modifyProfileImage({ content: result[2], contentType: result[1] });
	};

	onLogin = () => {
		const { refetchAccount, notify: displayNotification } = this.props;

		this.toggleChangePassword(false);

		displayNotification({
			message: <Text id="loginScreen.resetPass.passwordChanged" />
		});

		refetchAccount();
	};

	onLanguageChange = val => {
		const { modifyPrefs, notify: displayNotification } = this.props;

		modifyPrefs({ zimbraPrefLocale: val })
			.then(() => this.setState({ showLanguageModal: false }))
			.catch(err => {
				console.error(err);

				displayNotification({
					message: <Text id="error.genericInvalidRequest" />,
					failure: true
				});
			});
	};

	render(
		{
			name,
			userName,
			refetchAccount,
			zimbraFeatureChangePasswordEnabled,
			zimbraPrefLocale,
			profileImageId,
			zimbraOrigin,
			imageURL,
			...props
		},
		{ showChangePassword, showChangeProfileImage, showLanguageModal }
	) {
		return (
			<div class={s.headerActions}>
				<ActionMenu
					actionButtonClass={s.headerActionButton}
					anchor="end"
					arrow={false}
					label={
						<span class={s.headerAction}>
							{props.matchesScreenMd ? (
								<span class={s.headerActionTitle}>
									<Avatar
										class={s.headerActionImage}
										profileImageURL={profileImageId && imageURL}
										email={userName}
									/>
									{name}
									<Icon class={s.headerActionArrow} name="caret-down" size="md" />
								</span>
							) : (
								<Icon class={s.headerActionIcon} name="user-circle-o" />
							)}
						</span>
					}
				>
					<DropDownWrapper>
						<ActionMenuGroup>
							{zimbraFeatureChangePasswordEnabled && (
								<ActionMenuItem
									onClick={callWith(this.toggleModal, {
										modalState: 'showChangePassword',
										status: true
									})}
								>
									<Text id="header.CHANGE_PASSWORD" />
								</ActionMenuItem>
							)}
							{
								<ActionMenuItem
									onClick={callWith(this.toggleModal, {
										modalState: 'showChangeProfileImage',
										status: true
									})}
								>
									<Text id="header.changeProfileImage" />
								</ActionMenuItem>
							}
							<ActionMenuItem onClick={this.handleLogout}>
								<Text id="header.LOGOUT" />
							</ActionMenuItem>
						</ActionMenuGroup>
					</DropDownWrapper>
				</ActionMenu>
				<span class={s.headerAction}>
					<ActionMenuSettings
						onClickSettings={props.toggleSettings}
						onClickAbout={props.toggleAbout}
						onClickLanguage={callWith(this.toggleModal, {
							modalState: 'showLanguageModal',
							status: true
						})}
						actionButtonClass={s.settingsActionButton}
						iconClass={s.settingsIcon}
					/>
				</span>
				{showChangePassword && (
					<ModalDialog
						onClickOutside={callWith(this.toggleModal, {
							modalState: 'showChangePassword',
							status: false
						})}
						autofocusChildIndex={1}
					>
						<Login
							showChangePassword
							username={userName}
							onClose={callWith(this.toggleModal, {
								modalState: 'showChangePassword',
								status: false
							})}
							onLogin={this.onLogin}
						/>
					</ModalDialog>
				)}
				{showChangeProfileImage && (
					<PhotoUploadModal
						onClose={callWith(this.toggleModal, {
							modalState: 'showChangeProfileImage',
							status: false
						})}
						imageURL={imageURL}
						saveImage={this.saveImage}
					/>
				)}
				{showLanguageModal && (
					<LanguageModal
						zimbraPrefLocale={zimbraPrefLocale}
						onClose={callWith(this.toggleModal, { modalState: 'showLanguageModal', status: false })}
						onLanguageChange={this.onLanguageChange}
					/>
				)}
			</div>
		);
	}
}
