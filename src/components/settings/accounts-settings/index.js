import { h, Component } from 'preact';
import { withText, Text } from 'preact-i18n';
import find from 'lodash-es/find';
import get from 'lodash-es/get';

import ports from '../../../constants/ports';

import ActiveAccountsView from './active-accounts';
import AddOtherAccountView from './add-account';
import EditAccountView from './edit-account';
import ConfirmDeleteAccountView from './confirm-delete-account';
import Breadcrumb from '../../breadcrumb';
import ErrorBar from '../../error-bar';

import { getInputValue } from '../../../lib/util';

const NEW_ACCOUNT_FORM_DATA = {
	accountType: 'imap',
	destFolderName: '',
	emailAddress: '',
	host: '',
	leaveOnServer: true,
	password: '',
	port: ports.imap.crypt,
	username: '',
	useSSL: true,
	useCustomPort: false,
	useCustomFolder: true
};

class AccountsSettings extends Component {
	handleMailForwardingActiveChange = () => {
		// Clear the value when we are unchecking the field.
		if (this.state.showMailForwardingAddress) {
			this.props.onFieldChange('mailForwardingAddress')({
				target: { value: '' }
			});
			this.setState({
				showMailForwardingAddress: false
			});
		} else {
			this.setState({
				showMailForwardingAddress: true
			});
		}
	};

	switchActiveScreen = ([newView, editAccountId]) => {
		this.setState({ activeScreen: newView });

		if (editAccountId) {
			this.setState({ selectedAccountId: editAccountId });
			this.props.accountChangeEvent(editAccountId);
		}
	};

	addErrorId = errorId =>
		this.setState({
			errorIds: [].concat(...this.state.errorIds.filter(id => id !== errorId), [errorId])
		});

	removeErrorId = errorId =>
		this.setState({
			errorIds: [].concat(...this.state.errorIds.filter(id => id !== errorId))
		});

	onSelectedAccountFormChange = (target, accountId) => e =>
		this.setState({
			accountsList: [].concat(
				...this.state.accountsList,
				Object.assign({}, this.state.accountsList[accountId], {
					[target]: getInputValue(e)
				})
			)
		});

	onFormDataChange = target => e => {
		this.setState({
			accountFormData: {
				...this.state.accountFormData,
				[target]: getInputValue(e)
			}
		});
	};

	handleSubmitNewAccount = data => {
		this.setState({
			accountFormError: null
		});

		return this.props.onSubmitNewAccount(data).then(() => {
			this.setState({
				activeScreen: 'active',
				accountFormData: { ...NEW_ACCOUNT_FORM_DATA }
			});
		});
	};

	handleAfterNavigation = () => {
		this.switchActiveScreen(['active']);
	};

	constructor(props) {
		super(props);
		this.state = {
			showMailForwardingAddress: !!props.value.mailForwardingAddress,
			activeScreen: 'active',
			accountFormData: { ...NEW_ACCOUNT_FORM_DATA },
			accountsList: [],
			selectedAccountId: '',
			signature: '',
			errorIds: []
		};
	}

	componentDidMount() {
		this.props.afterNavigation(this.handleAfterNavigation);
	}

	componentWillReceiveProps = nextProps => {
		if (nextProps.accounts !== this.props.accounts) {
			this.setState({ accountsList: nextProps.accounts });
		}
	};

	componentWillUpdate(nextProps) {
		if (!nextProps.value.showMailForwardingAddress && this.state.showMailForwardingAddress) {
			this.setState({
				showMailForwardingAddress: true
			});
		}
	}

	componentWillUnmount = () => {
		this.setState({ accountFormData: { ...NEW_ACCOUNT_FORM_DATA } });
	};

	render(
		{
			onFieldChange,
			value,
			mailForwardingExampleAddress,
			updateAccountSettings,
			accounts,
			accountInfoQuery
		},
		{ activeScreen, accountFormData, showMailForwardingAddress, errorIds, selectedAccountId }
	) {
		const { mailForwardingAddress, mailLocalDeliveryDisabled } = value;
		const selectedAccount = selectedAccountId && find(accounts, ['id', selectedAccountId]);

		const activeAccountsProps = {
			accounts,
			switchActiveScreen: this.switchActiveScreen
		};

		const AddAccountProps = {
			onFormDataChange: this.onFormDataChange,
			onSubmit: this.handleSubmitNewAccount,
			formData: accountFormData,
			errorIds,
			addErrorId: this.addErrorId,
			removeErrorId: this.removeErrorId
		};

		const EditAccountProps = {
			selectedAccount,
			listOfAccounts: accounts,
			selectedAccountId,
			updateAccountSettings,
			onSelectedAccountFormChange: this.onSelectedAccountFormChange,
			switchView: this.switchActiveScreen,
			onFieldChange,
			mailForwardingAddress,
			mailLocalDeliveryDisabled,
			mailForwardingExampleAddress,
			handleMailForwardingActiveChange: this.handleMailForwardingActiveChange,
			showMailForwardingAddress
		};

		const ConfirmDeleteProps = {
			id: selectedAccountId,
			folderId: get(selectedAccount, 'l'),
			accountName: get(selectedAccount, 'name'),
			accountType: get(selectedAccount, 'accountType'),
			switchView: this.switchActiveScreen,
			accountInfoQuery
		};

		const renderActiveAccounts = () => (
			<div>
				<ActiveAccountsView {...activeAccountsProps} />
			</div>
		);

		const renderAddAccounts = () => (
			<div>
				{errorIds.length !== 0 && (
					<ErrorBar>
						{errorIds.map(id => (
							<p>
								<Text id={id} />
							</p>
						))}
					</ErrorBar>
				)}
				<Breadcrumb
					items={[
						{ display: 'Accounts', value: 'active' },
						{ display: 'New account', value: 'add' }
					]}
					switchView={this.switchActiveScreen}
				/>
				<AddOtherAccountView {...AddAccountProps} />
			</div>
		);

		const renderEditAccount = () => (
			<div>
				<Breadcrumb
					items={[{ display: 'Accounts', value: 'active' }, { display: 'Edit details', value: '' }]}
					switchView={this.switchActiveScreen}
				/>
				<EditAccountView {...EditAccountProps} />
			</div>
		);

		const renderConfirmAccountRemoval = () => (
			<div>
				<Breadcrumb
					items={[
						{ display: 'Accounts', value: 'active' },
						{ display: 'Edit details', value: 'edit' },
						{ display: 'Confirm removal', value: '' }
					]}
					switchView={this.switchActiveScreen}
				/>
				<ConfirmDeleteAccountView {...ConfirmDeleteProps} />
			</div>
		);

		switch (activeScreen) {
			case 'active':
				return renderActiveAccounts();
			case 'add':
				return renderAddAccounts();
			case 'edit':
				return renderEditAccount();
			case 'confirmRemoval':
				return renderConfirmAccountRemoval();
			default:
				break;
		}
	}
}

export default withText({
	mailForwardingExampleAddress: 'settings.accounts.mailForwardingExampleAddress'
})(AccountsSettings);
