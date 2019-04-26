import { h, Component } from 'preact';
import { Button } from '@zimbra/blocks';
import clone from 'lodash-es/clone';
import findIndex from 'lodash-es/findIndex';
import { Text, withText } from 'preact-i18n';
import { callWith, isValidEmail } from '../../../lib/util';
import cx from 'classnames';
import withAccountInfo from '../../../graphql-decorators/account-info';
import isValidDomain from 'is-valid-domain';

import ErrorBar from '../../error-bar';

import style from '../style';

@withText({
	placeholder: 'settings.blockedAddresses.placeholder'
})
@withAccountInfo(({ data: { accountInfo: account } }) => ({
	maxBlocked: account.attrs.zimbraMailBlacklistMaxNumEntries
}))
export default class BlockedAddressesSettings extends Component {
	state = {
		addressToBlock: null,
		selected: null,
		error: false
	};

	selectAddress = address => {
		this.setState({ selected: address });
	};

	onAddressToBlockChange = ev => {
		this.setState({ addressToBlock: ev.target.value });
	};

	onBlockAddress = () => {
		if (isValidEmail(this.state.addressToBlock) || isValidDomain(this.state.addressToBlock)) {
			this.props.onFieldChange('blockedAddresses')({
				target: {
					value: this.props.value.blockedAddresses.concat(this.state.addressToBlock)
				}
			});
			this.setState({
				addressToBlock: '',
				error: false
			});
		} else {
			this.setState({ error: true });
		}
	};

	onUnblockSelectedAddress = () => {
		if (this.state.selected) {
			const idx = findIndex(this.props.value.blockedAddresses, a => this.state.selected === a);
			const blockedAddressesClone = clone(this.props.value.blockedAddresses);
			blockedAddressesClone.splice(idx, 1);
			this.props.onFieldChange('blockedAddresses')({
				target: {
					value: blockedAddressesClone
				}
			});
			this.setState({ selected: null });
		}
	};

	render({ value, placeholder, maxBlocked }, { selected, error }) {
		return (
			<div>
				{error && (
					<ErrorBar>
						<Text id="settings.blockedAddresses.errorInvalid" />
					</ErrorBar>
				)}
				<div class={cx(style.sectionTitle, style.hideMdUp)}>
					<Text id="settings.blockedAddresses.title" />
				</div>
				<div class={style.subsection}>
					<div class={style.subsectionTitle}>
						<Text id="settings.blockedAddresses.blockedAddresses" />
						<br />
						<Text
							id="settings.blockedAddresses.used"
							fields={{ currentBlocked: value.blockedAddresses.length, maxBlocked }}
						/>
					</div>
					<div class={style.subsectionBody}>
						<Text id="settings.blockedAddresses.add" />
						<input
							type="text"
							class={cx(style.textInput, style.block)}
							placeholder={placeholder}
							value={this.state.addressToBlock}
							onChange={this.onAddressToBlockChange}
						/>
						<ul class={style.emailAddressList}>
							{value.blockedAddresses.map(address => (
								<li
									class={cx(style.emailAddressListEntry, address === selected && style.selected)}
									onClick={callWith(this.selectAddress, address)}
								>
									{address}
								</li>
							))}
						</ul>
						<div>
							<Button class={style.subsectionBodyButton} onClick={this.onBlockAddress}>
								<Text id="settings.blockedAddresses.block" />
							</Button>
							<Button onClick={this.onUnblockSelectedAddress} class={style.subsectionBodyButton}>
								<Text id="settings.blockedAddresses.remove" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
