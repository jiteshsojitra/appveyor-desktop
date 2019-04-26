import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import get from 'lodash-es/get';
import Avatar from '../../../avatar';
import CloseButton from '../../../close-button';
import OpenAddEditDelegatesButton from './open-add-edit-delegates-button';
import { SEND_AS, SEND_ON_BEHALF } from '../../../../constants/rights';
import { displayAddress } from '../../../../utils/contacts';
import { withRevokeAllRights } from '../../../../graphql-decorators/rights';
import withSearchGal from '../../../../graphql-decorators/search/search-gal';
import style from './style';

@withRevokeAllRights()
@withSearchGal({
	skip: ({ address }) => !address,
	options: ({ address }) => ({
		variables: {
			name: address,
			type: 'account',
			limit: 1
		}
	}),
	props: ({ data: { searchGal, ...data } }) => ({
		...data,
		contact: get(searchGal, 'contacts.0')
	})
})
export default class DelegatesListItem extends Component {
	handleRemoveDelegate = () => {
		this.props.onRevokeAllRights(this.props.address);
	};

	render(props) {
		const { address, contact, rights } = props;

		const flatRights = rights.map(({ right }) => right);
		const sendAsRight = ~flatRights.indexOf(SEND_AS);
		const sendOnBehalfOfRight = ~flatRights.indexOf(SEND_ON_BEHALF);

		return (
			<li class={style.listItem}>
				<div>
					<Avatar class={style.avatar} contact={contact} />
				</div>
				<div class={style.contact}>
					{contact && <div class={style.name}>{displayAddress(contact)}</div>}
					<div class={style.address}>{address}</div>
				</div>
				<div>
					<OpenAddEditDelegatesButton
						sendAsRight={sendAsRight}
						sendOnBehalfOfRight={sendOnBehalfOfRight}
						address={address}
					>
						<Text id="settings.writingEmail.delegates.permissions" />
					</OpenAddEditDelegatesButton>
				</div>
				<CloseButton onClick={this.handleRemoveDelegate} />
			</li>
		);
	}
}
