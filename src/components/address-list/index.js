import { h, Component } from 'preact';
import ZimletSlot from '../zimlet-slot';
import { withText } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';
import cx from 'classnames';
import ContactHoverCard from '../contact-hover-card';
import style from './style';
import withMediaQuery from '../../enhancers/with-media-query';
import withSearch from '../../graphql-decorators/search';
import { minWidth, screenMd } from '../../constants/breakpoints';
import ContactEditorModal from '../contact-editor-modal';
import { isPossiblySpoofedAddress } from '../../utils/phishing';
import get from 'lodash/get';

export default function AddressList({ type, addresses, showEmail, bold, wrap = true, className }) {
	if (!addresses || !addresses.length) return;

	const list = (
		<span class={cx(style.addresses, bold && style.bold)}>
			{addresses.map(address => (
				<Sender type={type} address={address} showEmail={showEmail} />
			))}
		</span>
	);

	if (wrap !== false) {
		return (
			<div class={cx(style.addressList, style['addresses-' + type], className)}>
				{type !== 'from' && <span class={style.addressType}>{type}</span>}
				{list}
			</div>
		);
	}

	return list;
}

@withText('mail.viewer.spoofedAddressWarning')
@withMediaQuery(minWidth(screenMd), 'desktopView')
@withSearch({
	options: ({ address }) => ({
		variables: {
			query: address.address || address.email || address,
			types: 'contact',
			limit: 1
		}
	})
})
class Sender extends Component {
	toggleEditModal = () => {
		this.setState({ showEditModal: !this.state.showEditModal });
		this.props.afterEdit && this.props.afterEdit();
	};

	render({ address, showEmail, desktopView, search, spoofedAddressWarning }, { showEditModal }) {
		const email = address.address || address.email,
			name = address.name || address.shortName || String(email).split('@')[0];

		const contact = get(search, 'contacts.0');
		const isSpoofed = isPossiblySpoofedAddress({ email, name });

		const recipient = (
			<span class={style.address}>
				<ZimletSlot name="sender-list-item" email={email} />
				{isSpoofed && <Icon size="sm" name="warning" title={spoofedAddressWarning} />}
				<span class={style.addressName} title={email}>
					{name}
				</span>
				{showEmail && <span class={style.addressDetail}>&lt;{email}&gt;</span>}
				{showEditModal && contact && (
					<ContactEditorModal contact={contact} onClose={this.toggleEditModal} />
				)}
			</span>
		);

		return desktopView ? (
			<ContactHoverCard
				address={email || address}
				contact={contact}
				name={name}
				toggleEditModal={this.toggleEditModal}
				target={recipient}
			/>
		) : (
			recipient
		);
	}
}
