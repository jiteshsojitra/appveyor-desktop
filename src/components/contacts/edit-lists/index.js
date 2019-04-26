import { h, Component } from 'preact';
import { Button, ModalDialog, ChoiceInput } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import { callWith, pluck } from '../../../lib/util';
import get from 'lodash-es/get';
import withSearch from '../../../graphql-decorators/search';
import withGetContactsMembership from '../../../graphql-decorators/contact/membership';
import CreateList from './create-list';
import { CONTACTS } from '../../../constants/folders';
import CloseButton from '../../close-button';
import style from './style';

@withSearch({
	options: ({ lastUpdated }) => ({
		variables: {
			query: `in:"${CONTACTS}" #type:group`,
			types: 'contact',
			sortBy: 'nameAsc',
			limit: 1000,
			lastUpdated
		}
	}),
	props: ({ data: { search } }) => ({
		contactGroups: get(search, 'contacts') || []
	})
})
@withGetContactsMembership({
	options: ({ selectedContacts }) => ({
		variables: {
			ids: (selectedContacts || []).map(({ id }) => id),
			derefGroupMember: true,
			memberOf: true
		}
	})
})
export default class EditLists extends Component {
	state = {
		selected: []
	};

	save = () => {
		const contactGroups = this.state.selected.slice();

		this.props
			.onSave({
				contactGroups
			})
			.then(this.close);
	};

	close = () => {
		const { onClose } = this.props;
		onClose && onClose();
	};

	toggleItem = id => {
		const selected = this.state.selected.slice(),
			index = selected.indexOf(id);

		index < 0 ? selected.push(id) : selected.splice(index, 1);
		this.setState({ selected });
	};

	/**
	 * Get the intersection of groups that the selected contacts are all members of
	 *
	 * We're picking the group IDs of first contact (which is selectedGroups), iterating through rest of the selected contacts,
	 * and finding out if there are any common group IDs the other contacts have compared to first selected contact.
	 * Hence, `i` is started from `1`.
	 */
	contactGroupsFromContacts = (selectedContacts = [], contactMembership = []) => {
		let selectedGroups =
			(pluck(contactMembership, 'id', selectedContacts[0].id) || {}).groupIds || [];

		for (
			let i = 1,
				totalSelectedContacts = selectedContacts.length,
				totalSelectedGroups = selectedGroups.length;
			i < totalSelectedContacts && totalSelectedGroups;
			i++
		) {
			const memberOf =
				(pluck(contactMembership, 'id', selectedContacts[i].id) || {}).groupIds || [];
			selectedGroups = selectedGroups.filter(groupId => memberOf.indexOf(groupId) !== -1);
		}

		return selectedGroups;
	};

	setSelectedContactGroups = ({ selectedContacts, contactMembership }) => {
		this.setState({
			selected: this.contactGroupsFromContacts(selectedContacts, contactMembership)
		});
	};

	componentDidMount() {
		this.setSelectedContactGroups(this.props);
	}

	componentWillReceiveProps(nextProps) {
		if (
			nextProps.contactMembership !== this.props.contactMembership ||
			nextProps.selectedContacts !== this.props.selectedContacts
		) {
			this.setSelectedContactGroups(nextProps);
		}
	}

	render({ contactGroups }, { selected }) {
		return (
			<ModalDialog
				overlayClass={style.backdrop}
				class={style.editLists}
				onClickOutside={this.close}
			>
				<div class={style.inner}>
					<header class={style.header}>
						<h2>
							<Text id="contacts.editLists.DIALOG_TITLE" />
						</h2>
						<CloseButton class={style.actionButton} onClick={this.close} />
					</header>

					<div class={style.content}>
						<div class={style.createItem}>
							<CreateList />
						</div>
						{contactGroups.map(({ fileAsStr: name, id }) => (
							<label class={style.item}>
								<ChoiceInput
									checked={selected.indexOf(id) !== -1}
									onChange={callWith(this.toggleItem, id)}
								/>
								<span>{name}</span>
							</label>
						))}
					</div>

					<footer class={style.footer}>
						<Button styleType="primary" onClick={this.save}>
							<Text id="buttons.done">Done</Text>
						</Button>
						<Button onClick={this.close}>
							<Text id="buttons.cancel">Cancel</Text>
						</Button>
					</footer>
				</div>
			</ModalDialog>
		);
	}
}
