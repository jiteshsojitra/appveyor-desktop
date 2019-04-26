import { h } from 'preact';
import partition from 'lodash-es/partition';
import { withAriaId } from '@zimbra/a11y';
import { Text, MarkupText } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import PureComponent from '../../lib/pure-component';
import SmartList from '../smart-list';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import cx from 'classnames';
import { DIALOGS_RESTORE, DIALOGS_EXPORT, DIALOGS_IMPORT, DIALOGS_DELETE_LIST } from './constants';
import { callWith, getId } from '../../lib/util';
import { setDataTransferJSON } from '@zimbra/util/src/data-transfer-manager';
import { displayAddress, getName, getPrimaryPhone, getPrimaryEmail } from '../../utils/contacts';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import Search from '../search';
import ContextMenu from '../context-menu';
import { ContactContextMenu } from '../context-menus';
import { configure } from '../../config';
import ZimletSlot from '../zimlet-slot';
import style from './style';
import { USER_FOLDER_IDS } from '../../constants';
import escape from 'lodash-es/escape';

const DEFAULT_SORT_BY_FIELD = 'displayName';
const SORTS = ['firstName', 'lastName', 'email', DEFAULT_SORT_BY_FIELD];

export default class ContactList extends PureComponent {
	state = {
		sort: DEFAULT_SORT_BY_FIELD
	};

	doSort = (a, b) => {
		const field = this.state.sort,
			dispNameOfA = displayAddress(a),
			dispNameOfB = displayAddress(b);

		const valueOfA =
				field === DEFAULT_SORT_BY_FIELD || !a.attributes[field] ? dispNameOfA : a.attributes[field],
			valueOfB =
				field === DEFAULT_SORT_BY_FIELD || !b.attributes[field] ? dispNameOfB : b.attributes[field];

		if (valueOfA && valueOfB) {
			const comparedResult = valueOfA.localeCompare(valueOfB, undefined, { sensitivity: 'base' });

			if (comparedResult === 0 && field !== DEFAULT_SORT_BY_FIELD) {
				// When valueOfA and valueOfB are same and it's not default sort, we'll sort based on their display name.
				return dispNameOfA.localeCompare(dispNameOfB, undefined, { sensitivity: 'base' });
			}

			return comparedResult;
		}

		if (valueOfA) return 1;
		if (valueOfB) return -1;
	};

	setSortField = sort => {
		this.setState({ sort });
	};

	reverseSortDirection = () => {
		this.setState({
			sortDirection: this.state.sortDirection === -1 ? 1 : -1
		});
	};

	renderHeader = props => {
		if (this.props.header === false || this.props.ContactListHeader === false) {
			return null;
		}

		const Child = this.props.ContactListHeader || ContactListHeader;
		return (
			<Child
				{...props}
				sort={this.state.sort}
				sortDirection={this.state.sortDirection}
				setSortField={this.setSortField}
				reverseSortDirection={this.reverseSortDirection}
				showDialog={this.props.showDialog}
				searchInline={this.props.searchInline}
				showDeleteListButton={this.props.showDeleteListButton}
			/>
		);
	};

	renderContactListItem = ({ item, ...props }) => {
		const Child = this.props.ContactListItem || ContactListItem;

		const {
			renderBadge,
			onAssignToLists,
			onRemoveFromList,
			onDeleteContact,
			onEditDetails,
			onShareContact,
			showPermanentlyDelete,
			isEditable,
			isDeletable,
			onContextMenuMount,
			selected
		} = this.props;

		if (renderBadge) {
			props.renderBadge = renderBadge;
		}

		const menu = (
			<ContactContextMenu
				onAssignToLists={onAssignToLists}
				onRemoveFromList={onRemoveFromList}
				onDeleteContact={onDeleteContact}
				onEditDetails={onEditDetails}
				onShareContact={onShareContact}
				showPermanentlyDelete={showPermanentlyDelete}
				isEditable={isEditable}
				isDeletable={isDeletable}
				onMount={callWith(onContextMenuMount, {
					selected,
					selectedId: getId(item),
					contact: item
				})}
			/>
		);

		return (
			<ContextMenu menu={menu}>
				<Child {...props} contact={item} />{' '}
			</ContextMenu>
		);
	};

	render(
		{ searchInline, contacts, selected, onSelectionChange, class: className, isTrashFolder },
		{ sort, sortDirection }
	) {
		let sortableContacts = contacts.slice(); // Create new contacts container (prop 'contact' should not be modified).

		if (sort || sortDirection) {
			if (sort !== DEFAULT_SORT_BY_FIELD) {
				// We first need to distinguish between contacts not having values for selected `sort` attribute key.
				const segregatedContacts = partition(
					sortableContacts,
					({ attributes }) => !!attributes[sort]
				);

				// Then, we need to sort them seperately.
				sortableContacts = [
					...segregatedContacts[1].sort(this.doSort), // Contacts not having values for selected `sort` attribute key.
					...segregatedContacts[0].sort(this.doSort) // Contacts having values for selected `sort` attribute key.
				];
			} else {
				sortableContacts.sort(this.doSort);
			}

			sortDirection === -1 && sortableContacts.reverse();
		}

		return (
			<SmartList
				class={className}
				items={sortableContacts}
				selected={selected}
				onSelectionChange={onSelectionChange}
				renderItem={this.renderContactListItem}
				header={this.renderHeader}
				virtualized={sortableContacts.length >= 500}
				rowHeight={72}
				searchInline={searchInline}
				isTrashFolder={isTrashFolder}
			/>
		);
	}
}

@configure('showPrint')
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
class ContactListHeader extends PureComponent {
	handlePopoverToggle = active => {
		this.setState({ active });
	};

	closePopover = () => {
		this.setState({ active: false });
	};

	showRestoreContacts = () => {
		this.closePopover();
		this.props.showDialog(DIALOGS_RESTORE);
	};

	handleDeleteList = () => {
		this.closePopover();
		this.props.showDialog(DIALOGS_DELETE_LIST);
	};

	showImportContacts = () => {
		this.closePopover();
		this.props.showDialog(DIALOGS_IMPORT);
	};

	showExportContacts = () => {
		this.closePopover();
		this.props.showDialog(DIALOGS_EXPORT);
	};

	render({
		searchInline,
		matchesScreenMd,
		actions,
		allSelected,
		sort,
		sortDirection,
		setSortField,
		reverseSortDirection,
		showDeleteListButton,
		handleLocalSearch,
		showPrint
	}) {
		const sortLabel = <Text id={`contacts.headerDropdown.${sort || 'sortBy'}`} />;

		return (
			<header className={cx(style.toolbar, style.leftPanelHeader)}>
				{searchInline && matchesScreenMd && (
					<div class={cx(style.row)}>
						<Search
							showDropDown
							localSearch
							searchInline={searchInline}
							handleLocalSearch={handleLocalSearch}
						/>
					</div>
				)}

				<div class={cx(style.row, style.sort)}>
					<ChoiceInput checked={allSelected} onClick={actions.toggleSelectAll} />

					<ActionMenu label={sortLabel} anchor="end">
						<DropDownWrapper>
							<ActionMenuGroup>
								{SORTS.map(type => (
									<ActionMenuItem
										icon={sort === type && 'check'}
										onClick={callWith(setSortField, type)}
									>
										<Text id={`contacts.headerDropdown.${type}`} />
									</ActionMenuItem>
								))}
								<ActionMenuItem
									icon={sortDirection === -1 && 'check'}
									onClick={reverseSortDirection}
								>
									<Text id="contacts.headerDropdown.reverseSortOrder" />
								</ActionMenuItem>
							</ActionMenuGroup>
							<ActionMenuGroup>
								<ActionMenuItem onClick={this.showImportContacts}>
									<Text id="contacts.headerDropdown.import" />
								</ActionMenuItem>
								<ActionMenuItem onClick={this.showExportContacts}>
									<Text id="contacts.headerDropdown.export" />
								</ActionMenuItem>
							</ActionMenuGroup>

							<ActionMenuGroup>
								<ZimletSlot name="action-menu-contact-list" />
								<ZimletSlot name="action-menu-restore-contacts" />
								{showPrint && (
									<ActionMenuGroup>
										<ActionMenuItem>
											<Text id="contacts.headerDropdown.printAll" />
										</ActionMenuItem>
									</ActionMenuGroup>
								)}
							</ActionMenuGroup>
							{showDeleteListButton && (
								<ActionMenuGroup>
									<ActionMenuItem onClick={this.handleDeleteList}>
										<Text id="contacts.headerDropdown.deleteList" />
									</ActionMenuItem>
								</ActionMenuGroup>
							)}
						</DropDownWrapper>
					</ActionMenu>
				</div>
			</header>
		);
	}
}

@withAriaId('contact-li')
class ContactListItem extends PureComponent {
	handleClick = event => {
		const { onClick, contact } = this.props;
		onClick({ contact, event });
	};

	handleDragStart = e => {
		const { contact } = this.props;

		if (!this.props.selected) this.handleClick(e);

		setDataTransferJSON(e, {
			data: {
				type: 'contact',
				id: contact.id,
				contact
			},
			itemCount: this.context.store.getState().contacts.selected.length
		});
	};

	toggle = () => {
		this.props.onClick({ action: 'toggle' });
	};

	componentDidUpdate(prevProps) {
		const { selected, allSelected } = this.props,
			el = this.base;
		if (!allSelected && selected && !prevProps.selected) {
			el.focus();
		}
	}

	render({ contact, a11yId, selected, renderBadge, isTrashFolder }) {
		const tabindex = selected ? '0' : '-1';
		const attrs = contact.attributes || {};
		const isDeleted = contact.folderId === USER_FOLDER_IDS.TRASH.toString();
		const contactName = getName(attrs) || <Text id="contacts.list.noName" />;

		return (
			<li
				class={cx(style.contact, selected && style.selected)}
				tabindex={tabindex}
				draggable
				onDragStart={this.handleDragStart}
			>
				<span>
					<label for={a11yId} />
					<ChoiceInput
						id={a11yId}
						readOnly
						checked={!!selected}
						tabindex={tabindex}
						onChange={this.toggle}
					/>
				</span>
				<div onClick={this.handleClick}>
					<h4>
						{isDeleted && !isTrashFolder && (
							<MarkupText
								id="contacts.list.deleted"
								fields={{
									contactNameMarkup: `<span class=${style.trashedContact}>${escape(
										contactName
									)}</span>`,
									deletedClass: cx(style.deleted, style.list)
								}}
							/>
						)}
						{(!isDeleted || isTrashFolder) && <span> {contactName} </span>}
					</h4>
					{getPrimaryEmail(contact) && <h5>{getPrimaryEmail(contact)}</h5>}
					{getPrimaryPhone(contact) && <h6>{getPrimaryPhone(contact)}</h6>}
					{renderBadge && renderBadge(contact)}
				</div>
			</li>
		);
	}
}
