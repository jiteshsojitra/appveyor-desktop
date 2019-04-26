import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import find from 'lodash/find';
import withAutoComplete from '../../graphql-decorators/autocomplete';
import withAutoCompleteGAL from '../../graphql-decorators/autocompleteGAL';
import withAccountInfo from '../../graphql-decorators/account-info';
import ContactSuggestion from '../contact-suggestion';
import isEmpty from 'lodash-es/isEmpty';
import { branch, renderNothing, withProps } from 'recompose';
import { compose, withApollo } from 'react-apollo';
import withLunrIndex from '../../enhancers/with-lunr-index';
import contactFields from '../../graphql/fragments/contact.graphql';
import { zimbraQueryToLunrQuery } from '../../utils/search';
import { connect } from 'preact-redux';
import { CONTACTS_VIEW } from '../../constants/views';

import style from './style';

const byRank = (a, b) => b.ranking - a.ranking;
@connect(state => ({
	isOffline: state.network.isOffline
}))
@branch(
	({ isOffline }) => isOffline,
	compose(
		withLunrIndex(CONTACTS_VIEW),
		withApollo,
		withProps(({ client, lunrIndex, sort, ...props }) => ({
			contactSuggestions:
				props.value !== ''
					? lunrIndex.search(zimbraQueryToLunrQuery(`*${props.value}*`)).map(
							({ ref }) =>
								client.readFragment({
									id: `Contact:${ref}`,
									fragment: contactFields,
									fragmentName: 'contactFields'
								}).attributes
					  )
					: []
		}))
	),
	compose(
		withAutoComplete(),
		withAccountInfo(({ data: { accountInfo: account } }) => ({
			zimbraFeatureGalEnabled: account.attrs.zimbraFeatureGalEnabled,
			zimbraFeatureGalAutoCompleteEnabled: account.attrs.zimbraFeatureGalAutoCompleteEnabled
		})),
		withAutoCompleteGAL({
			skip: ({
				value,
				isLocation,
				isGalOnly,
				zimbraFeatureGalEnabled,
				zimbraFeatureGalAutoCompleteEnabled
			}) =>
				!(zimbraFeatureGalEnabled && zimbraFeatureGalAutoCompleteEnabled) ||
				!value ||
				value.length < 3 ||
				!(isLocation || isGalOnly),
			props: ({ data, ownProps }) => ({
				galContacts:
					data.loading || !data.autoCompleteGAL || !data.autoCompleteGAL.contacts
						? []
						: data.autoCompleteGAL.contacts
								.map(val => val.attributes)
								.filter(
									attributes => !ownProps.isLocation || attributes.zimbraCalResType === 'Location'
								)
			})
		})
	)
)
@branch(
	({ galContacts, contactSuggestions }) => isEmpty(galContacts) && isEmpty(contactSuggestions),
	renderNothing
)
export default class Suggestions extends PureComponent {
	counter = 0;

	selectAddress = contact => {
		const { galContacts, contactSuggestions } = this.props;
		this.props.onSelectionChange({
			index: (galContacts || contactSuggestions).indexOf(contact),
			value: contact
		});
	};

	chooseAddress = contact => {
		if (!this.props.wasPreviouslySelected || !this.props.wasPreviouslySelected(contact)) {
			this.props.onSelect(contact);
		}
	};

	getSelectedIndex() {
		const { selectedIndex, contactSuggestions, galContacts } = this.props;
		return (
			selectedIndex &&
			Math.max(0, Math.min((galContacts || contactSuggestions).length - 1, selectedIndex))
		);
	}

	static defaultProps = {
		filter() {}
	};

	componentWillReceiveProps({
		contactSuggestions,
		selectedIndex,
		commitSelectedIndex,
		onSelectionChange,
		galContacts
	}) {
		const list = galContacts || contactSuggestions;
		const count = list ? list.length : 0;
		if (selectedIndex && selectedIndex >= count) {
			onSelectionChange(count - 1);
		}
		if (count && commitSelectedIndex != null) {
			this.chooseAddress(list[commitSelectedIndex]);
		}
	}

	renderContact = (contact, index) => {
		const token = find(this.props.tokens, t => t.originalEmail === contact.email);

		return (
			<ContactSuggestion
				input={this.props.value}
				token={token}
				active={this.getSelectedIndex() === index}
				selected={this.props.tokens && Boolean(token)}
				previouslySelected={
					this.props.wasPreviouslySelected && this.props.wasPreviouslySelected(contact)
				}
				previouslySelectedLabel={
					typeof this.props.previouslySelectedLabel === 'function'
						? this.props.previouslySelectedLabel(contact)
						: this.props.previouslySelectedLabel
				}
				contact={contact}
				onSelect={this.selectAddress}
				onClick={this.chooseAddress}
				onRemove={this.props.onRemove}
				isLocation={this.props.isLocation}
			/>
		);
	};

	render({ contactSuggestions, galContacts, isLocation, isGalOnly }) {
		const contacts =
			isLocation || isGalOnly ? galContacts : contactSuggestions.slice().sort(byRank);

		return <div class={style.suggestions}>{contacts.map(this.renderContact)}</div>;
	}
}
