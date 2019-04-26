import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import SettingsToolbar from '../settings-toolbar';
import { Text } from 'preact-i18n';
import { graphql } from 'react-apollo';
import { withStateHandlers } from 'recompose';
import mapValues from 'lodash-es/mapValues';
import isEmpty from 'lodash-es/isEmpty';
import isEqual from 'lodash-es/isEqual';
import findIndex from 'lodash-es/findIndex';
import find from 'lodash-es/find';
import get from 'lodash-es/get';
import uniqBy from 'lodash-es/uniqBy';
import values from 'lodash-es/values';
import ModifyIdentityMutation from '../../graphql/queries/preferences/identity/modify-identity-mutation.graphql';
import accountInfo from '../../graphql-decorators/account-info/normalized-identities';
import AccountInfoQuery from '../../graphql/queries/preferences/account-info.graphql';
import ModifyZimletPrefs from '../../graphql/mutations/modify-zimlet-prefs.graphql';
import { withModifyPrefs } from '../../graphql-decorators/preferences';
import {
	withModifySignature,
	withDeleteSignature,
	withCreateSignature
} from '../../graphql-decorators/account-info/signature';
import { withFilters, withModifyFilters } from '../../graphql-decorators/preferences/filters';
import {
	getMailboxMetadata,
	withSetMailboxMetaData
} from '../../graphql-decorators/mailbox-metadata';
import {
	updateWhiteBlackList,
	whiteBlackList
} from '../../graphql-decorators/white-black-list/index.js';
import { FIELD_TYPES, SETTINGS_CONFIG, FIELD_TYPE_METHODS } from '../settings/constants';
import { shallowEqualIds, empty, deepClone } from '../../lib/util';
import mailPort from '../../utils/mail-port';
import { toggle, show } from '../../store/settings/actions';
import getMailFolders from '../../graphql-decorators/get-mail-folders';
import withCreateFolderMutation from '../../graphql-decorators/create-folder';
import Settings from '../settings';
import { ModalDialog, Button } from '@zimbra/blocks';
import ModalDrawer from '../modal-drawer';
import CloseButton from '../close-button';
import cx from 'classnames';
import style from './style.less';
import withCommandHandlers from '../../keyboard-shortcuts/with-command-handlers';
import withMediaQuery from '../../enhancers/with-media-query/index';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { shallowEqual } from '../../lib/pure-component';
import {
	withAddExternalAccount,
	withModifyExternalAccount,
	withImportExternalAccountData
} from '../../graphql-decorators/external-account';
import { WEBCLIENT_OFFLINE_BROWSER_KEY } from '../../constants/offline';

const mapSettingsFieldConfig = (state, ownProps, { type, key, defaultValue, toJS }) => {
	const preferenceValue = FIELD_TYPE_METHODS[type].selector(state, key, ownProps);

	const preferenceValueOrDefault = !empty(preferenceValue) ? preferenceValue : defaultValue;
	return toJS ? toJS(preferenceValueOrDefault) : preferenceValueOrDefault;
};

@accountInfo()
@withFilters()
@withModifyFilters()
@getMailboxMetadata()
@getMailFolders()
@withSetMailboxMetaData()
@whiteBlackList()
@withStateHandlers(
	{ masterSettingsConfig: SETTINGS_CONFIG },
	{
		addSettings: ({ masterSettingsConfig }) => settingsConfigs => ({
			masterSettingsConfig: uniqBy([...masterSettingsConfig, ...settingsConfigs], 'id')
		})
	}
)
@connect((state, ownProps) => ({
	visible: state.settings.visible,
	persistedSettings: ownProps.masterSettingsConfig.reduce(
		(memo, settingsConfig) => ({
			...memo,
			[settingsConfig.id]: mapValues(
				settingsConfig.fields,
				mapSettingsFieldConfig.bind(null, state, ownProps)
			)
		}),
		{}
	)
}))
@withModifyPrefs()
@withCreateSignature()
@withModifySignature()
@withDeleteSignature()
@withAddExternalAccount()
@withModifyExternalAccount()
@withImportExternalAccountData()
@graphql(ModifyIdentityMutation, {
	props: ({ ownProps: { denormalizeIdentity }, mutate }) => ({
		modifyIdentity: displayIdentity =>
			mutate({
				variables: {
					id: displayIdentity.id,
					attrs: denormalizeIdentity(displayIdentity)
				},
				refetchQueries: [
					{
						query: AccountInfoQuery
					}
				],
				optimisticResponse: {
					__typename: 'Mutation',
					modifyIdentity: true
				},
				update: proxy => {
					const data = proxy.readQuery({ query: AccountInfoQuery });
					const identities = get(data, 'accountInfo.identities');
					identities.identity[0]._attrs = { ...identities.identity[0]._attrs, displayIdentity };
					identities.identity[0].__typename = identities.identity[0].__typename || 'Identity';
					identities.__typename = identities.__typename || 'Identities';
					proxy.writeQuery({ query: AccountInfoQuery, data });
				}
			})
	})
})
@graphql(ModifyZimletPrefs, {
	props: ({ mutate }) => ({
		modifyZimletPrefs: zimletPrefs =>
			mutate({
				variables: {
					zimlets: zimletPrefs
				},
				optimisticResponse: {
					__typename: 'Mutation',
					modifyPrefs: true
				},
				update: proxy => {
					const data = proxy.readQuery({ query: AccountInfoQuery });

					//Update presence of modified zimlet in AccountInfoQuery
					for (const zimletPref of zimletPrefs) {
						const zimletList = data.accountInfo.zimlets.zimlet;

						for (let index = 0; index < zimletList.length; index++) {
							if (zimletPref.name === zimletList[index].zimlet[0].name) {
								zimletList[index].zimletContext[0].presence = zimletPref.presence;
							}
						}
					}

					proxy.writeQuery({ query: AccountInfoQuery, data });
				}
			})
	})
})
@updateWhiteBlackList()
@withCommandHandlers(props => [
	{
		context: 'all',
		command: 'GO_TO_PREFERENCES',
		handler: () => props.dispatch(show())
	}
])
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@withCreateFolderMutation()
export default class SettingsModal extends Component {
	state = {
		settings: this.props.persistedSettings,
		accountsSettings: this.props.accounts || [],
		signature: '',
		zimletPrefs: [],
		zimletPrefsModified: false
	};

	updateAccountSettings = (info, accountId) => {
		const accountsSettingsCopy = deepClone(this.state.accountsSettings);
		const modifiedIndex = findIndex(accountsSettingsCopy, account => account.id === accountId);
		let modifiedAccount = accountsSettingsCopy.splice(modifiedIndex, 1)[0];
		modifiedAccount = Object.assign({}, modifiedAccount, ...info);
		accountsSettingsCopy.splice(modifiedIndex, 0, modifiedAccount);
		const signatureArray = get(this.props, 'accountInfoQuery.accountInfo.signatures.signature');
		if (info.showSignatureEditor && signatureArray && signatureArray.length) {
			signatureArray.forEach(s => {
				const name = s.name.includes('-') && s.name.split('-')[1].trim();
				if (name === modifiedAccount.name) {
					modifiedAccount.defaultSignature = s.id;
					modifiedAccount.defaultSignatureValue = s.content[0]._content;
					modifiedAccount.showSignatureEditor = true;
					modifiedAccount.forwardReplySignature = s.id;
					modifiedAccount.forwardReplySignatureValue = s.content[0]._content;
					this.saveAccount(modifiedAccount);
				}
			});
		}
		this.setState({
			accountsSettings: accountsSettingsCopy
		});
	};

	setLocalBrowserKey = ({ localOfflineBrowserKey }) => {
		this.setState({
			localOfflineBrowserKey
		});
	};

	saveAccount = accountSettings => {
		const action =
			accountSettings.accountType === undefined
				? this.props.modifyIdentity
				: this.props.modifyExternalAccount;
		return action(accountSettings);
	};

	handleChangeActiveId = activeId => {
		this.setState({ activeId });
	};

	handleChange = settings =>
		new Promise(resolve => {
			this.setState({ settings }, resolve);
		});

	handleSave = () => {
		const {
			createSignature,
			modifySignature,
			persistedSettings,
			masterSettingsConfig
		} = this.props;
		const { accountsSettings, selectedAccountId, settings } = this.state;

		const selectedAccount =
			accountsSettings.find(account => account.id === selectedAccountId) || accountsSettings[0];

		if (selectedAccount) {
			const { id, defaultSignature, defaultSignatureValue, showSignatureEditor } = selectedAccount;
			const prevAccount = find(this.props.accounts, a => a.id === id) || {};
			if (showSignatureEditor && prevAccount.defaultSignatureValue) {
				if (defaultSignatureValue !== prevAccount.defaultSignatureValue) {
					modifySignature({
						id: defaultSignature,
						contentType: 'text/html',
						value: defaultSignatureValue
					});
				}
				this.saveAccount(selectedAccount);
			} else if (!showSignatureEditor && prevAccount.defaultSignatureValue) {
				this.saveAccount({
					...selectedAccount,
					defaultSignature: '',
					forwardReplySignature: ''
				});
			} else if (showSignatureEditor && !isEmpty(defaultSignatureValue)) {
				createSignature({
					name: `Default Signature - ${selectedAccount.name} - ${new Date()}`,
					contentType: 'text/html',
					value: defaultSignatureValue,
					account: selectedAccount
				}).then(data => {
					const sigId = get(data, 'data.createSignature.signature.0.id');
					this.saveAccount({
						...selectedAccount,
						defaultSignature: sigId,
						forwardReplySignature: sigId
					});
				});
			} else {
				this.saveAccount(selectedAccount);
			}
		}

		const defaultUpdates = values(FIELD_TYPES).reduce((memo, type) => {
			memo[type] = {};
			return memo;
		}, {});

		// Build a map of settings type to its keyed changed values. We aggregate
		// across all tabs as keys of the same field type might live across multiple
		// tabs and we want to make a single update with all changed values.
		const updates = masterSettingsConfig.reduce((memo, settingsConfig) => {
			const settingsTab = settings[settingsConfig.id];
			Object.keys(settingsTab).forEach(fieldName => {
				const persistedSetting = persistedSettings[settingsConfig.id];

				const { type, key, fromJS } = find(masterSettingsConfig, { id: settingsConfig.id }).fields[
					fieldName
				];
				if (!isEqual(settingsTab[fieldName], persistedSetting[fieldName])) {
					const updatedSetting = settingsTab[fieldName];
					memo[type][key] = fromJS ? fromJS(updatedSetting) : updatedSetting;
				}
				settingsConfig.afterSave && settingsConfig.afterSave(this.state);
			});
			return memo;
		}, defaultUpdates);
		this.onToggle();

		values(FIELD_TYPES).forEach(fieldType => {
			const update = updates[fieldType];

			!isEmpty(update) && FIELD_TYPE_METHODS[fieldType].updateAction(update, this.props);
		});
	};

	createFolderByName = (baseFolderName, duplicateCount = 0) => {
		const folderName =
			duplicateCount > 0 ? `${baseFolderName} - ${duplicateCount + 1}` : baseFolderName;
		const folder = find(this.props.folders, ['absFolderPath', `/${folderName}`]);

		return folder
			? this.createFolderByName(baseFolderName, duplicateCount + 1)
			: this.props.createFolder({
					variables: {
						name: folderName,
						fetchIfExists: true
					}
			  });
	};

	handleCreateNewAccount = data => {
		const { addExternalAccount, importExternalAccount } = this.props;
		const {
			formData: {
				accountType,
				emailAddress,
				host,
				leaveOnServer,
				password,
				port: customPort,
				useCustomFolder,
				username,
				useCustomPort,
				useSSL
			}
		} = data;
		const folderName = useCustomFolder ? username : 'Inbox';
		const port = useCustomPort ? customPort : mailPort(accountType, useSSL);

		return this.createFolderByName(folderName).then(({ data: { createFolder } }) =>
			addExternalAccount({
				accountType,
				emailAddress,
				host,
				password,
				port,
				username,
				connectionType: useSSL ? 'ssl' : 'cleartext',
				isEnabled: true,
				l: createFolder.id,
				leaveOnServer: accountType === 'pop3' ? leaveOnServer : true,
				name: username
			}).then(({ data: { addExternalAccount: id } }) =>
				id !== undefined
					? importExternalAccount({
							accountType,
							id
					  })
					: Promise.resolve()
			)
		);
	};

	onToggle = () => this.props.dispatch(toggle());

	onAccountChanged = id => {
		this.setState({
			selectedAccountId: id
		});
	};

	handleCloseDrawer = () => {
		// Tell the drawer to close itself, it will perform an animation and then
		// call `onToggle`
		this.setState({ isDrawerMounted: false });
	};

	handleZimletSettingsChange = name => {
		if (name === 'settings') {
			this.loadSettingsFromZimlets();
		}
	};

	/**
	 * Accept dynamic settings from Zimlets.
	 * See `components/settings/constants.js` to understand settings structure.
	 *
	 * Usage from Zimlet:
	 *
	 * plugins.register('settings', {
	 *   id: 'myZimletWithSettings',
	 *   title: 'The title in the settings list.',
	 *   component: (props) => { return 'The content of the main panel.' },
	 *   fields: {
	 *     myNewSetting: {
	 *       type: 'userPref',
	 *       key: 'zimbraPrefExample',
	 *       defaultValue: 0
	 *     }
	 *   }
	 * });
	 */
	loadSettingsFromZimlets = () => {
		const results = this.context.zimlets.invokePlugin('settings');
		if (results) {
			// TODO: Consider adding validation to help Zimlet developers know if they
			// added settings correctly
			this.props.addSettings(results);
		}
	};

	componentDidMount() {
		this.setLocalBrowserKey({
			localOfflineBrowserKey: localStorage.getItem(WEBCLIENT_OFFLINE_BROWSER_KEY)
		});

		this.context.zimlets.on('plugins::changed', this.handleZimletSettingsChange);
		this.loadSettingsFromZimlets();
	}

	componentWillReceiveProps(nextProps) {
		if (!shallowEqual(this.props.persistedSettings, nextProps.persistedSettings)) {
			this.setState({ settings: nextProps.persistedSettings });
		}

		if (!shallowEqualIds(nextProps.accounts, this.state.accountsSettings)) {
			this.setState({
				accountsSettings: nextProps.accounts
			});
		}
	}

	componentWillUnmount() {
		this.context.zimlets.off('plugins::changed', this.handleZimletSettingsChange);
	}

	render(
		{ matchesScreenMd, masterSettingsConfig, ...props },
		{ settings, accountsSettings, activeId, isDrawerMounted }
	) {
		const [ComponentClass, componentClassProps] = matchesScreenMd
			? [ModalDialog, { autofocusChildIndex: 1 }]
			: [
					ModalDrawer,
					{
						mounted: isDrawerMounted,
						toolbar: (
							<SettingsToolbar
								activeId={activeId}
								onOpenItem={this.handleChangeActiveId}
								onClickSave={this.handleSave}
								onClickCancel={this.handleCloseDrawer}
							/>
						)
					}
			  ];

		return (
			props.visible && (
				<ComponentClass {...componentClassProps} onClickOutside={this.onToggle}>
					<div class={style.inner}>
						<div class={cx(style.header, style.hideSmDown)}>
							<Text id="settings.modal.title">Settings</Text>
							<CloseButton onClick={this.onToggle} />
						</div>
						<div class={style.contentWrapper}>
							<Settings
								activeId={activeId}
								onChangeActiveId={this.handleChangeActiveId}
								value={settings}
								updateAccountSettings={this.updateAccountSettings}
								onChange={this.handleChange}
								onSubmitNewAccount={this.handleCreateNewAccount}
								accounts={accountsSettings}
								accountInfoQuery={props.accountInfoQuery}
								onSave={this.handleSave}
								onCancel={this.onToggle}
								accountChangeEvent={this.onAccountChanged}
								setLocalBrowserKey={this.setLocalBrowserKey}
								masterSettingsConfig={masterSettingsConfig}
							/>
						</div>
						<div class={cx(style.footer, style.hideSmDown)}>
							<Button
								onClick={this.handleSave}
								styleType="primary"
								brand="primary"
								disabled={!settings}
							>
								<Text id="buttons.save" />
							</Button>
							<Button onClick={this.onToggle}>
								<Text id="buttons.cancel" />
							</Button>
						</div>
					</div>
				</ComponentClass>
			)
		);
	}
}
