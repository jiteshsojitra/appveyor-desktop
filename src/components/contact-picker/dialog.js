import { h, Component } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import { withPropsOnChange } from 'recompose';
import { Button, Option, ModalDialog, ChoiceInput } from '@zimbra/blocks';
import CloseButton from '../close-button';
import withSearchGal from '../../graphql-decorators/search/search-gal';
import get from 'lodash-es/get';
import { munge } from '../../lib/util';
import find from 'lodash-es/find';
import map from 'lodash-es/map';
import without from 'lodash-es/without';
import { getName, getContactGroupFolderId } from '../../utils/contacts';
import ContactPickerContact from './contact';
import cx from 'classnames';
import withSearch from '../../graphql-decorators/search';
import withGetContacts from '../../graphql-decorators/contact/get-contacts';
import { CONTACT_GROUP_PREFIX } from '../../constants/contacts';
import ActionMenuContactFolderList from '../action-menu-contact-folder';
import style from './style';

const getContactEmail = contact => get(contact, 'attributes.email');

@withPropsOnChange(['folder'], ({ folder }) => ({
	isContactGroup: folder && folder.startsWith(CONTACT_GROUP_PREFIX)
}))
@withSearchGal({
	skip: ({ folder }) => folder !== 'galContacts',
	options: () => ({
		variables: {
			type: 'account',
			limit: 1000,
			sortBy: 'nameAsc'
		}
	})
})
@withSearch({
	skip: ({ isContactGroup, folder }) => isContactGroup || folder === 'galContacts',
	options: ({ folder }) => ({
		variables: {
			query:
				(folder ? `${folder.match(/^\d+$/) ? 'inid' : 'in'}:"${folder}" ` : '') + 'NOT #type:group',
			types: 'contact',
			sortBy: 'nameAsc',
			limit: 1000,
			needExp: true
		}
	}),
	props: ({ data: { search } }) => ({
		contacts: get(search, 'contacts') || []
	})
})
@withGetContacts({
	skip: ({ isContactGroup }) => !isContactGroup,
	options: ({ folder }) => ({
		variables: {
			id: getContactGroupFolderId(folder),
			derefGroupMember: true
		}
	})
})
export default class ContactPickerDialog extends Component {
	contactsById = {};

	close = () => this.props.onClose();

	save = () => {
		const { selected, onSave } = this.props;
		onSave(selected.map(this.getContact));
		this.close();
	};

	getContact = id => {
		const contactById = this.contactsById[id];

		if (contactById) {
			return contactById;
		}

		const { contacts, additionalContacts = [] } = this.props;
		return find([...contacts, ...additionalContacts], ({ id: contactId }) => id === contactId);
	};

	selectContact = contact => {
		let { selected, setSelected, folder } = this.props;
		const { id } = contact;

		if (selected.indexOf(id) === -1) {
			// `isGalContact` will help to avoid unnecessary searchGal call
			// for hover-card while selecting emails using contact-chooser.
			contact.isGalContact = folder === 'galsContacts';
			selected = selected.concat(id);
			this.contactsById[id] = contact;
		} else {
			selected = selected.filter(c => c !== id);
		}

		setSelected(selected);
	};

	selectAllContacts = (contacts, contactFolderSelectedCount) => event => {
		let { selected, setSelected } = this.props;

		if (event.target.checked && contactFolderSelectedCount === 0) {
			contacts.forEach(contact => {
				const { id } = contact;
				if (selected.indexOf(id) === -1) {
					selected.push(id);
					this.contactsById[id] = contact;
				}
			});
		} else {
			const contactIds = map(contacts, 'id');
			selected = without(selected, ...contactIds);
		}

		setSelected(selected);
	};

	setQuery = e => this.setState({ query: e.target.value });

	setFolder = id => this.props.setFolder(id || null);

	isSelected = ({ id: contactId }) => (get(this.props, 'selected') || []).indexOf(contactId) !== -1;

	isInMainContacts = contact => {
		if (this.props.folders.find(f => f.id === contact.folderId)) {
			return contact;
		}
	};

	matchesQuery = contact => {
		const ctx = munge([getContactEmail(contact), getName(contact.attributes)].join(' '));
		return ctx.indexOf(munge(this.state.query)) !== -1;
	};

	renderContact = contact => {
		const selectedIds = get(this.props, 'selected') || [];
		const { id } = contact;
		return (
			<ContactPickerContact
				contact={contact}
				selected={selectedIds.indexOf(id) !== -1}
				onClick={this.selectContact}
			/>
		);
	};

	renderFolder = ({ id, name }) => <Option value={id} title={name} iconPosition="right" />;

	renderContactGroup = ({ id, fileAsStr }) => (
		<Option value={`${CONTACT_GROUP_PREFIX}${id}`} title={fileAsStr} iconPosition="right" />
	);

	render(
		{
			contacts = [],
			field,
			pending,
			selected,
			folder,
			folders = [],
			contactGroups,
			galContacts = []
		},
		{ query }
	) {
		contacts = contacts.filter(this.isInMainContacts);
		contacts = [].concat(...contacts, ...galContacts).filter(getContactEmail);
		if (query) {
			contacts = contacts.filter(this.matchesQuery);
		}

		const contactsCount = contacts.length;
		const contactFolderSelectedCount = contacts.filter(this.isSelected).length;
		const diff = selected.length - contactFolderSelectedCount;

		// Add any items filtered out by the selection at the bottom:
		let more;
		if (diff > 0) {
			const visibleIds = contacts.map(({ id }) => id);
			more = [
				<div class={cx(style.divider, style.additionalSelected)}>
					<Text
						id="contacts.picker.additionalSelectedItems"
						plural={diff}
						fields={{ count: diff }}
					/>
				</div>
			].concat(
				selected
					.filter(id => visibleIds.indexOf(id) === -1)
					.map(id => this.renderContact({ ...this.getContact(id), inoperable: true }))
			);
		}

		return (
			<ModalDialog
				overlayClass={style.backdrop}
				class={cx(style.dialog, style.scrollable)}
				onClickOutside={this.close}
			>
				<div class={style.inner}>
					<header class={style.header}>
						<h2>
							<Text id="contacts.picker.title" />
						</h2>

						<p class={style.description}>
							<Text id="contacts.picker.description" fields={{ field }} />
						</p>

						<CloseButton class={style.actionButton} onClick={this.close} />

						<div class={style.query}>
							<Localizer>
								<input
									class={style.query}
									placeholder={<Text id="contacts.picker.searchPlaceholder" />}
									value={query}
									onInput={this.setQuery}
								/>
							</Localizer>
						</div>

						<div class={style.changeFolder}>
							<ActionMenuContactFolderList
								containerClass={style.dropdownContainer}
								actionButtonClass={style.popoverButton}
								actionTitleClass={style.popoverTitle}
								selectedFolder={folder}
								folders={folders}
								contactGroups={contactGroups}
								onChange={this.setFolder}
							/>
						</div>
						{!!contactsCount && (
							<div class={cx(style.contact, style.selectAll)}>
								<div class={style.flexItem}>
									<ChoiceInput
										id="selectAllContacts"
										checked={!!contactsCount && contactFolderSelectedCount === contactsCount}
										onClick={this.selectAllContacts(contacts, contactFolderSelectedCount)}
									/>
								</div>
								<div class={style.flexItem}>
									<label for="selectAllContacts">
										<strong>
											<Text id="contacts.picker.selectAllContacts" />
										</strong>
									</label>
								</div>
							</div>
						)}
					</header>
					<div class={cx(style.content, !contactsCount && style.hideSelectAll)}>
						{contactsCount ? (
							contacts.map(this.renderContact)
						) : (
							<span class={style.noContacts}>
								<Text id="lists.empty" />
							</span>
						)}
						{more}
					</div>

					<footer class={style.footer}>
						<Button styleType="primary" onClick={this.save} disabled={pending}>
							<Text id="buttons.done" />
						</Button>
						<Button onClick={this.close}>
							<Text id="buttons.cancel" />
						</Button>

						<span class={style.selectionState}>
							<Text
								id="contacts.picker.numOfSelectedContacts"
								plural={selected.length}
								fields={{ count: selected.length }}
							/>
						</span>
					</footer>
				</div>
			</ModalDialog>
		);
	}
}
