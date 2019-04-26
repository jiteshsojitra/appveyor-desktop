import { h, Component } from 'preact';
import { route } from 'preact-router';
import { Text } from 'preact-i18n';
import { Button, ClickOutsideDetector } from '@zimbra/blocks';
import { withPropsOnChange } from 'recompose';
import MenuItem from '../menu-item';
import Sidebar from '../sidebar';
import FolderList from '../folder-list';
import ContactGroupsList from '../folder-list/contact-groups-list';
import ContactList from './list';
import CreateList from './edit-lists/create-list';
import DeleteList from './edit-lists/delete-list';
import ExportContacts from './export-contacts';
import ImportContactsFromFile from './import-contacts/from-file';
import ContactEditor from './editor';
import ContactDetails from './contact-details';
import ContactsToolbar from './toolbar';
import cx from 'classnames';
import { connect } from 'preact-redux';
import { configure } from '../../config';
import * as contactsActionCreators from '../../store/contacts/actions';
import { openModalCompose as openModalComposeAction } from '../../store/email/actions';
import { getAttachmentPreviewVisibility } from '../../store/attachment-preview/selectors';
import { setPreviewAttachment } from '../../store/attachment-preview/actions';
import wire from 'wiretie';
import { getId, callWith } from '../../lib/util';
import { getName, getPrimaryEmail, getContactGroupFolderId } from '../../utils/contacts';
import { pruneEmpty } from '../../utils/filter';
import array from '@zimbra/util/src/array';
import { getDataTransferJSON } from '@zimbra/util/src/data-transfer-manager';
import { types as apiClientTypes } from '@zimbra/api-client';
import style from './style';
import AssignToLists from './edit-lists';
import SelectedContactsActions from './selected-contacts-actions';
import withCreateMountpoint from '../../graphql-decorators/create-mountpoint';
import {
	DIALOGS_EXPORT,
	DIALOGS_IMPORT,
	DIALOGS_ASSIGN_TO_LISTS,
	DIALOGS_DELETE_LIST,
	DIALOGS_DELETE_PERMANENT,
	DIALOGS_SAVE_CHANGES
} from './constants';
import get from 'lodash-es/get';
import find from 'lodash-es/find';
import { CONTACTS_VIEW } from '../../constants/views';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { CONTACTS, TRASH } from '../../constants/folders';
import { CONTACT_GROUP_PREFIX } from '../../constants/contacts';
import ModalDrawer from '../modal-drawer';
import DeleteContactDialog from '../delete-contact-dialog';
import SaveContactDialog from '../save-contact-dialog';
import { notify } from '../../store/notifications/actions';
import { showNotificationModal } from '../../store/notification-modal/actions';
import withGetContactFolders from '../../graphql-decorators/contact/folders';
import withGetShareInfo from '../../graphql-decorators/share-info/shareinfo';
import withContactAction from '../../graphql-decorators/contact/contact-action';
import withSearch from '../../graphql-decorators/search';
import { withModifyContactList } from '../../graphql-decorators/contact/create-modify-list';
import withGetContacts from '../../graphql-decorators/contact/get-contacts';
import { RightSideAdSlot, LeftSideAdSlot } from '../ad-slots';
import withAccountInfo from '../../graphql-decorators/account-info';
import { isLicenseActive } from '../../utils/license';
import cloneDeep from 'lodash-es/cloneDeep';
import { USER_FOLDER_IDS, INTERNAL_GAL_PATH } from '../../constants';
import { getFirstParentWithAttribute } from '../../lib/util.js';

const { ActionOps } = apiClientTypes;

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@configure({ urlSlug: 'routes.slugs.contacts', searchInline: 'searchInline' })
@connect(
	state => ({
		selected: get(state, 'contacts.selected', []),
		lastUpdated: get(state, 'contacts.lastUpdated'),
		matches: null,
		isAttachmentViewerOpen: getAttachmentPreviewVisibility(state),
		isOffline: get(state, 'network.isOffline')
	}),
	{
		...contactsActionCreators,
		openModalCompose: openModalComposeAction,
		closeAttachmentViewer: setPreviewAttachment,
		notify,
		showNotificationModal
	}
)
@wire('zimbra', null, ({ contacts }) => ({
	getContactVcf: contacts.getVcf
}))
@withAccountInfo(({ data: { accountInfo: account } }) => ({
	isEnterprise: isLicenseActive(account.license),
	zimbraFeatureGalEnabled: account.attrs.zimbraFeatureGalEnabled
}))
@withGetContactFolders({
	props: ({
		data: { getFolder, refetch: refetchContactFolders },
		ownProps: { isEnterprise, zimbraFeatureGalEnabled }
	}) => {
		let folders = get(getFolder, 'folders.0.folders') || [];
		const links = get(getFolder, 'folders.0.linkedFolders') || [];
		let galSharedID;

		if (isEnterprise && zimbraFeatureGalEnabled) {
			const galFolder = links.find(fol => fol.absFolderPath.includes(INTERNAL_GAL_PATH));

			if (galFolder) {
				folders = cloneDeep(folders);
				folders.push(galFolder);
				galSharedID = galFolder.sharedItemId;
			}
		}

		return {
			galSharedID,
			folders,
			refetchContactFolders,
			defaultContactFolder: find(
				folders,
				folder => parseInt(folder.id, 10) === USER_FOLDER_IDS.CONTACTS
			)
		};
	}
})
@withGetShareInfo({
	skip: ({ folders }) => (folders || []).find(fol => fol.absFolderPath.includes(INTERNAL_GAL_PATH)),
	variables: {
		grantee: {
			// Assume galsync folders are shared with entire domain, so only get those shares
			type: 'dom'
		}
	},
	props: ({ data: { shareInfo } }) => ({
		galShare: shareInfo && shareInfo.find(share => share.folderPath.includes(INTERNAL_GAL_PATH))
	})
})
@withCreateMountpoint()
@withContactAction()
@withModifyContactList()
@withPropsOnChange(['folders', 'folder', 'searchResults'], ({ folders, folder, searchResults }) => {
	const galFolder = folders.find(fol => fol.absFolderPath.includes(INTERNAL_GAL_PATH));
	return {
		isContactGroup: folder && folder.startsWith(CONTACT_GROUP_PREFIX),
		isGalFolder: galFolder && galFolder.name === folder,
		contacts: searchResults
	};
})
@withSearch({
	skip: ({ isContactGroup, searchResults }) => searchResults || isContactGroup,
	options: ({ folder }) => {
		let variables = {
			types: 'contact',
			needExp: true
		};

		if (folder === TRASH) {
			variables = {
				...variables,
				query: `in:"${folder}"`,
				limit: 55
			};
		} else {
			variables = {
				...variables,
				limit: 1000,
				sortBy: 'nameAsc',
				memberOf: true,
				query: `in:"${folder || CONTACTS}" NOT #type:group`
			};
		}
		return {
			variables
		};
	},
	props: ({ data: { search, refetch: refetchContacts } }) => {
		const contacts = get(search, 'contacts') || [];

		return {
			contacts: contacts.map(contact => pruneEmpty(contact)),
			refetchContacts
		};
	}
})
@withSearch({
	options: () => ({
		variables: {
			query: 'in:"Contacts" #type:group',
			types: 'contact',
			sortBy: 'nameAsc',
			limit: 1000,
			needExp: true
		}
	}),
	props: ({ data: { search } }) => ({
		contactGroups: get(search, 'contacts') || []
	})
})
@withGetContacts({
	skip: ({ isContactGroup, searchResults }) => searchResults || !isContactGroup,
	options: ({ folder }) => ({
		variables: {
			id: getContactGroupFolderId(folder),
			derefGroupMember: true
		}
	})
})
export default class Contacts extends Component {
	state = {
		isLoadingGalContacts: false,
		triggerSaveContact: false,
		contactValidationError: false,
		pauseBeforeUnload: false
	};

	createNewContact() {
		return {
			attributes: {}
		};
	}

	getFolderBadge = folder => folder.name === CONTACTS && folder.count;

	getFolderName = folder => {
		if (String(folder.id).toLowerCase() === USER_FOLDER_IDS.TRASH.toString()) {
			return <Text id="folderlist.deleted_contacts" />;
		} else if (folder.absFolderPath && folder.absFolderPath.includes(INTERNAL_GAL_PATH)) {
			return <Text id="contacts.picker.galContacts" />;
		}

		return folder.name;
	};

	removeFromList = () => {
		const { contactGroups, modifyContactList, selected, folder } = this.props;
		const groupId = getContactGroupFolderId(folder);

		if (selected && groupId) {
			modifyContactList({
				groupId,
				attributes: [],
				memberOps: selected.map(contactId => ({
					op: '-',
					type: 'C',
					value: contactId
				}))
			})
				.then(() => {
					const contactListName = get(find(contactGroups, ({ id }) => groupId === id), 'fileAsStr');

					this.props.notify({
						message: (
							<Text
								id={`contacts.editLists.${
									selected.length > 1 ? 'REMOVED_MULTIPLE_FROM_LIST' : 'REMOVED_FROM_LIST'
								}`}
								fields={{ name: contactListName, count: selected.length }}
							/>
						)
					});
				})
				.catch(error => {
					console.error(error);
					this.props.showNotificationModal({
						message: error
					});
				});
		}
	};

	contactsUpdated = cbData => {
		const { nextEditMode, nextContactId, nextContactDetails, contactValidationError } = this.state;
		this.props.setLastUpdated();
		this.closeContactEditor();

		!contactValidationError && this.clickedAnchor && route(this.clickedAnchor.pathname);
		this.clickedAnchor = null;

		if (cbData === true || get(cbData, 'data.modifyContact')) {
			this.setState({ triggerSaveOnConfirm: false, edit: nextEditMode });
			this.setSelection(nextContactId, { contact: nextContactDetails });
		}
	};

	handleContactListDrop = e => {
		const data = getDataTransferJSON(e, 'contact'),
			{ targetList: list, targetType: type } = e;

		if (data) {
			if (type === 'contactGroup') {
				this.assignSelectedContactsToList({ contactGroups: list.id, operation: '+' });
			} else {
				this.moveSelectedContacts({ folder: list });
			}
		}
	};

	onConfirmClick = () => {
		this.setState({ triggerSaveOnConfirm: true, pauseBeforeUnload: false });
	};

	handleDiscardChanges = () => {
		this.setState(
			{
				isFormDirty: false,
				triggerSaveOnConfirm: false,
				contactValidationError: false,
				pauseBeforeUnload: false
			},
			() => {
				this.contactsUpdated(true); // Pass flag to ignore reset nextContact state
			}
		);
		this.hideDialog(DIALOGS_SAVE_CHANGES);
	};

	updateOnFormChange = isFormDirty => {
		this.setState({ isFormDirty });
	};

	setSelection = (selected, { contact: contactDetails } = false) => {
		if (this.state.isFormDirty) {
			this.setState({ nextContactId: selected, nextContactDetails: contactDetails });
			this.showDialog(DIALOGS_SAVE_CHANGES);
			return;
		}

		const {
			isAttachmentViewerOpen,
			closeAttachmentViewer,
			setSelection,
			selected: prevSelected
		} = this.props;
		const { nextContactId, edit } = this.state;
		let editMode = edit;

		this.setState({ nextContactId: selected, nextContactDetails: contactDetails });

		if (
			nextContactId &&
			prevSelected.indexOf(nextContactId[0]) > -1 &&
			selected.indexOf(nextContactId[0]) === -1
		) {
			editMode = false;
		}

		this.setState({
			showContactDetails: !!contactDetails,
			contactDetails,
			edit: editMode,
			isFormDirty: false,
			nextEditMode: false,
			...(this.state.dialog && {
				dialog: null
			})
		});

		isAttachmentViewerOpen && closeAttachmentViewer();
		setSelection(selected);
	};

	handleContextMenuMount = ({ selected, selectedId, contact: item }) => {
		selected.indexOf(selectedId) !== -1
			? this.setState({ nextEditMode: false })
			: selected.length === 0
			? this.setSelection([selectedId], { contact: item })
			: this.setState({
					nextContactId: [selectedId],
					nextContactDetails: item,
					nextEditMode: false
			  });
	};

	closeContact = () => {
		this.props.closeAttachmentViewer();
		this.setSelection([]);
		if (!this.state.isFormDirty) {
			this.closeContactEditor();
		}
	};

	closeContactEditor = () => {
		const { isAttachmentViewerOpen, closeAttachmentViewer, contact, url } = this.props;
		this.setState({ edit: false, triggerSaveContact: false, isFormDirty: false });
		isAttachmentViewerOpen && closeAttachmentViewer();
		contact === 'new' && route(url.replace(/\/new$/, ''), true);
	};

	createContact = () => {
		const { urlSlug, folder } = this.props;
		route(`/${urlSlug}/${folder ? folder + '/' : ''}new`);
	};

	toggleEdit = () => {
		const { isFormDirty, contactDetails, nextContactId, nextContactDetails } = this.state;
		const { selected } = this.props;
		const reselectContact =
			contactDetails &&
			selected.indexOf(contactDetails.id) !== -1 &&
			(nextContactId && selected.indexOf(nextContactId[0]) !== -1);

		this.setState({ edit: true });

		if (reselectContact) {
			this.setState({ nextEditMode: false });
		} else if (!reselectContact && isFormDirty) {
			this.setState({ nextEditMode: true });
			this.showDialog(DIALOGS_SAVE_CHANGES);
		} else {
			this.setState({ nextEditMode: false });
			this.setSelection(nextContactId || selected, {
				contact: nextContactDetails || contactDetails
			});
		}
	};

	handleHideDialogOnError = () => {
		this.hideDialog(DIALOGS_SAVE_CHANGES);
		this.setState({ triggerSaveOnConfirm: false });
	};

	// Show a named dialog.
	showDialog = dialog => {
		this.setState({ dialog });
	};

	// Hide the named dialog, or whatever dialog is currently showing.
	hideDialog = dialog => {
		if (dialog == null || this.state.dialog === dialog) {
			this.showDialog(null);
		}
	};

	composeEmailForSelectedContacts = () => {
		const { contacts, selected, openModalCompose } = this.props;
		const to = contacts
			.filter(contact => selected.indexOf(getId(contact)) !== -1)
			.map(contact => ({
				address: (getPrimaryEmail(contact) || '').replace(/(^.+<\s*|\s*>\s*$)/g, ''),
				full: getName(contact.attributes),
				shortName: contact.attributes.firstName
			}));

		route('/email/new') &&
			openModalCompose({
				mode: 'mailTo',
				message: {
					to
				}
			});
	};

	// Get id of context-menu-edit while any other contact is open
	getContextContactId = selected => {
		const { nextContactId } = this.state;
		return (!selected && nextContactId) ||
			(nextContactId && nextContactId.length === 1 && selected.indexOf(nextContactId[0]) === -1)
			? nextContactId
			: selected;
	};

	composeEmailForSharingContact = () => {
		let { getContactVcf, openModalCompose, selected, contacts } = this.props;

		selected = this.getContextContactId(selected);
		if (selected) {
			const filteredContacts = contacts.filter(contact => {
				if (selected.indexOf(getId(contact)) !== -1) {
					return contact;
				}
			});

			const promises = filteredContacts.map(contact =>
				getContactVcf(contact.id).then(response => {
					const fileName = getName(contact.attributes);
					const vcfBlob = new Blob([response], { type: 'text/x-vcard' });
					vcfBlob.lastModified = new Date();
					vcfBlob.name = `${fileName}.vcf`;
					return vcfBlob;
				})
			);

			Promise.all(promises).then(files => {
				route('/email/new') &&
					openModalCompose({
						mode: 'mailTo',
						message: {
							attachments: files,
							bcc: [],
							cc: [],
							subject: '',
							to: []
						}
					});
			});
		}
	};

	assignSelectedContactsToList = ({ contactGroups, operation = 'overwrite' }) => {
		const { contacts, selected, modifyContactList } = this.props;
		const selectedIds = this.getContextContactId(selected);

		const selectedContactsMembershipMap = contacts
			.filter(({ id }) => selectedIds.indexOf(id) !== -1)
			.map(({ id, memberOf }) => ({
				contactId: id,
				memberOf: (memberOf || '').split(',').filter(Boolean)
			}));

		if (selectedContactsMembershipMap.length) {
			const newContactGroups = array(contactGroups);
			const updateMap = {};

			selectedContactsMembershipMap.forEach(({ contactId, memberOf }) => {
				if (operation === 'overwrite' || operation === '+') {
					newContactGroups.forEach(newGroupId => {
						if (memberOf.indexOf(newGroupId) === -1) {
							if (!updateMap[newGroupId]) {
								updateMap[newGroupId] = {
									groupId: newGroupId,
									attributes: [],
									memberOps: []
								};
							}

							updateMap[newGroupId].memberOps.push({
								op: '+',
								type: 'C',
								value: contactId
							});
						}
					});
				}

				if (operation === 'overwrite' || operation === '-') {
					memberOf.forEach(oldGroupId => {
						if (newContactGroups.indexOf(oldGroupId) === -1) {
							if (!updateMap[oldGroupId]) {
								updateMap[oldGroupId] = {
									groupId: oldGroupId,
									attributes: [],
									memberOps: []
								};
							}

							updateMap[oldGroupId].memberOps.push({
								op: '-',
								type: 'C',
								value: contactId
							});
						}
					});
				}
			});

			const promises = Object.keys(updateMap).map(groupId => modifyContactList(updateMap[groupId]));
			return Promise.all(promises)
				.then(result => {
					if (result.length) {
						this.props.notify({
							message: <Text id="contacts.editLists.ASSIGNMENT_CHANGED" />
						});
					}

					this.contactsUpdated();
				})
				.catch(error => {
					console.error(error);
					this.props.showNotificationModal({
						message: error
					});
				});
		}
	};

	moveSelectedContacts = ({ folder }) => {
		const { contactAction, selected } = this.props;

		if (!selected.length) return;

		contactAction({
			ids: selected,
			folderId: folder.id,
			op: ActionOps.move
		}).then(this.contactsUpdated);
	};

	restoreSelectedContacts = () => {
		const { defaultContactFolder, contactAction, selected, folders } = this.props;

		if (!selected.length || !folders.length) return;
		if (!defaultContactFolder) return;

		contactAction({
			ids: selected,
			folderId: defaultContactFolder.id,
			op: ActionOps.move
		});
	};

	isContactDeleted = selectId => {
		const { contacts } = this.props;
		const contact = find(contacts, ({ id }) => id === selectId);
		return contact && contact.folderId === USER_FOLDER_IDS.TRASH.toString();
	};

	deleteSelectedContacts = () => {
		const { contactAction, folder, selected, setSelection } = this.props;

		const selectedIds = this.getContextContactId(selected);
		const isSingleSelectAndDeleted =
			selectedIds && selectedIds.length === 1 ? this.isContactDeleted(selectedIds[0]) : false;

		if (!selectedIds.length) return;

		contactAction({
			ids: selectedIds,
			op: folder === TRASH || isSingleSelectAndDeleted ? ActionOps.delete : ActionOps.trash
		}).then(() => {
			setSelection([]);
			this.contactsUpdated();
			this.showContactDeleteToast(selected.length, folder, isSingleSelectAndDeleted);
		});
	};

	showContactDeleteToast = (count, folder, isSingleSelectAndDeleted) => {
		let message;

		if (TRASH === folder || isSingleSelectAndDeleted) {
			message = <Text id="toasts.permanentlyDeleteContacts" plural={count} fields={{ count }} />;
		} else {
			message = <Text id="toasts.deleteContacts" plural={count} fields={{ count }} />;
		}

		this.props.notify({ message });
	};

	handleSidebarScroll = e => {
		this.setState({
			isSidebarScrolled: e.target.scrollTop !== 0
		});
	};

	shouldPermanentlyDelete = () => TRASH === this.props.folder;

	isDeletable = () => {
		const { selected, contacts, isGalFolder } = this.props;

		// If we are in global address list then deleting is not allowed
		if (isGalFolder) return false;

		// Check if any selected contact is a gal contact
		const selectedContacts = contacts.filter(cnt => selected.includes(cnt.id));
		return selectedContacts && !selectedContacts.some(this.isGalContact);
	};

	isEditable = () => {
		const { selected, contacts, isGalFolder } = this.props;

		// If we are in global address list then editing is not allowed
		if (isGalFolder) return false;

		// Check if selected contact is gal contact
		if (selected.length === 1) {
			const selectedContact = contacts.find(cnt => selected.includes(cnt.id));
			return selectedContact && !this.isGalContact(selectedContact);
		}

		return false;
	};

	isTrashFolder = () => this.props.folder === TRASH;

	isGalContact = contact =>
		this.props.galSharedID && contact.folderId.split(':')[1] === this.props.galSharedID;

	handleConfirmPermanentDelete = () => {
		this.deleteSelectedContacts();
		this.hideDialog(DIALOGS_DELETE_PERMANENT);
	};

	getContactGroupType = () => get(this.props, 'contacts.attributes.type') || null;

	mountGalFolder = props => {
		const { folders, galShare, refetchContactFolders, createMountpoint } = props;
		const galFolder = (folders || []).find(fol => fol.absFolderPath.includes(INTERNAL_GAL_PATH));

		if (!this.state.isLoadingGalContacts && !galFolder && galShare) {
			this.setState({ isLoadingGalContacts: true });

			const { ownerEmail: owner, view, ownerId: ownerZimbraId, folderId: sharedItemId } = galShare;

			createMountpoint({
				name: owner.split('@')[0].concat(INTERNAL_GAL_PATH),
				view,
				owner,
				ownerZimbraId,
				sharedItemId,
				parentFolderId: USER_FOLDER_IDS.ROOT
			}).then(() => {
				refetchContactFolders();

				this.setState({ isLoadingGalContacts: false });
			});
		}
	};

	onSaveNewContact = () => {
		this.setState({ triggerSaveContact: true });
	};

	handleOnBeforeUnload = e => {
		const clickedAnchor = getFirstParentWithAttribute(e.target, 'href');

		//If element clicked is not an anchor or if the click is via a secondary button, return.
		if (clickedAnchor === false || e.button === 2) {
			return;
		}

		const { isFormDirty } = this.state;

		this.clickedAnchor = clickedAnchor;

		if (isFormDirty) {
			e.stopPropagation();
			e.preventDefault();

			this.setState({
				pauseBeforeUnload: true
			});

			this.closeContact();
		} else {
			route(clickedAnchor.pathname);
		}
	};

	handleValidationError = error => {
		this.setState({
			contactValidationError: error,
			triggerSaveContact: false
		});
	};

	unloadContactEdit = () => {
		this.setState({
			pauseBeforeUnload: false
		});
	};

	componentDidMount() {
		const { contact, selected } = this.props;
		if (contact && contact !== 'new' && !selected.length) {
			this.setSelection(array(getId(contact)));
		}

		this.mountGalFolder(this.props);
	}

	componentWillReceiveProps(nextProps) {
		const { galShare, selected, contacts, contact, url } = nextProps;

		const id = getId(contact);

		if (galShare !== this.props.galShare) {
			this.mountGalFolder(nextProps);
		}

		if (this.state.edit && selected[0] !== this.props.selected[0]) {
			this.setState({ edit: false });

			if (this.props.isAttachmentViewerOpen) {
				this.props.closeAttachmentViewer();
			}
		}

		if (id === 'new') {
			if (this.props.contact === 'new') {
				// "new" unchanged but selection change --> wipe /new  (eg: user clicked on contact while editing)
				if (selected[0] && selected[0] !== this.props.selected[0]) {
					route(url.replace(/\/new$/, ''), true);
				}
			} else if (selected[0]) {
				// navigated to /new, clear selection
				this.setSelection([]);
			}
		} else if (id && id !== getId(this.props.contact) && id !== getId(selected[0])) {
			// /contacts/:contact value changed, make that the selection
			this.setSelection(array(id));
		}

		// The selection contains an ID for which there is no longer a contact, so clear it:
		if (selected[0] && !find(contacts, ({ id: contactId }) => contactId === selected[0])) {
			this.setSelection([]);
		}
	}

	render(
		{
			searchInline,
			folder,
			folders,
			contact,
			contacts,
			contactGroup: selectedContactGroup,
			contactGroups,
			pending,
			selected,
			lastUpdated,
			urlSlug,
			isAttachmentViewerOpen,
			matchesScreenMd,
			isContactGroup,
			refetchContacts,
			isOffline
		},
		{
			isSidebarScrolled,
			edit,
			showContactDetails,
			dialog,
			triggerSaveOnConfirm,
			triggerSaveContact,
			isFormDirty
		}
	) {
		const allowActionDeleteRenameList = !!selectedContactGroup; // Should be set only when user is viewing Contact group.
		const selectedCount = selected ? selected.length : 0;
		const isNew = !selectedCount && contact === 'new';

		let view = selectedCount === 1 && contacts.find(({ id }) => id === selected[0]);

		const isTrashFolder = this.isTrashFolder();
		const isGalContact = view && this.isGalContact(view);

		if (isNew) {
			view = this.createNewContact();
			selected = [];
		}
		const isMultipleContact = selectedCount > 1;
		const contextContactId = this.getContextContactId(selected);
		const canRemoveFromList = !isNew && !edit && isContactGroup;

		const isSingleSelectAndDeleted =
			selectedCount === 1 ? this.isContactDeleted(selected[0]) : false;
		const isDeletedOrTrashed = isTrashFolder || isSingleSelectAndDeleted;

		const contactDetailInner =
			isNew || edit ? (
				<ClickOutsideDetector onClickOutside={this.handleOnBeforeUnload}>
					<ContactEditor
						folder={folder}
						contact={view}
						isNew={isNew}
						showCard={false}
						showHeader
						onSave={this.contactsUpdated}
						onCancel={this.closeContactEditor}
						hideDialogOnError={this.handleHideDialogOnError}
						onFormChange={this.updateOnFormChange}
						saveOnConfirmDialog={triggerSaveOnConfirm}
						onValidationError={this.handleValidationError}
					/>
				</ClickOutsideDetector>
			) : (
				<div class={style.inner}>
					<div class={style.toolbar}>
						{!isDeletedOrTrashed && !isGalContact && (
							<MenuItem icon="pencil" onClick={!isOffline && this.toggleEdit} disabled={isOffline}>
								<Text id="contacts.modalEdit.TITLE" />
							</MenuItem>
						)}

						{!isDeletedOrTrashed && (
							<MenuItem
								icon="assign-list"
								onClick={!isOffline && callWith(this.showDialog, DIALOGS_ASSIGN_TO_LISTS)}
								disabled={isOffline}
							>
								<Text id="contacts.editLists.DIALOG_TITLE" />
							</MenuItem>
						)}

						{isDeletedOrTrashed && !isGalContact && (
							<MenuItem
								icon="restore"
								onClick={!isOffline && this.restoreSelectedContacts}
								disabled={isOffline}
							>
								<Text id="buttons.restore" />
							</MenuItem>
						)}

						{isDeletedOrTrashed && !isGalContact && (
							<MenuItem
								icon="trash"
								onClick={!isOffline && callWith(this.showDialog, DIALOGS_DELETE_PERMANENT)}
								disabled={isOffline}
							>
								<Text id="buttons.deletePermanent" />
							</MenuItem>
						)}

						{canRemoveFromList && view && (
							<MenuItem
								icon="remove-list"
								onClick={!isOffline && this.removeFromList}
								disabled={isOffline}
							>
								<Text id="contacts.editLists.REMOVE_FROM_LIST" />
							</MenuItem>
						)}

						{!isDeletedOrTrashed && !isGalContact && (
							<MenuItem
								icon="trash"
								onClick={!isOffline && this.deleteSelectedContacts}
								disabled={isOffline}
							>
								<Text id="buttons.delete" />
							</MenuItem>
						)}

						<MenuItem icon="close" class={style.alignRight} onClick={this.closeContact} />
					</div>
					<ContactDetails
						folder={folder}
						contactGroups={contactGroups}
						contact={view}
						isGalContact={isGalContact}
						onSave={this.contactsUpdated}
						onClose={this.closeContact}
						isTrashFolder={isTrashFolder}
						isSingleSelectAndDeleted={isSingleSelectAndDeleted}
					/>
				</div>
			);

		const contactDetailInnerMobile =
			isNew || edit ? (
				<ContactEditor
					folder={folder}
					contact={view}
					isNew={isNew}
					showCard={false}
					showHeader
					onSave={this.contactsUpdated}
					triggerSaveContact={triggerSaveContact}
					hideDialogOnError={this.handleHideDialogOnError}
					onCancel={this.closeContactEditor}
					onFormChange={this.updateOnFormChange}
					saveOnConfirmDialog={triggerSaveOnConfirm}
					showFooter={matchesScreenMd}
					onValidationError={this.handleValidationError}
				/>
			) : (
				<ContactDetails
					folder={folder}
					contactGroups={contactGroups}
					contact={view}
					isGalContact={isGalContact}
					onSave={this.contactsUpdated}
					onClose={this.closeContact}
					isTrashFolder={isTrashFolder}
					isSingleSelectAndDeleted={isSingleSelectAndDeleted}
				/>
			);

		const mobileContactToolbar =
			!isNew && !edit ? (
				<div class={style.mobileToolbar}>
					{!isTrashFolder && !isGalContact && !isMultipleContact && (
						<MenuItem class={style.mobileToolbarItem} icon="pencil" onClick={this.toggleEdit} />
					)}
					{!isTrashFolder && !isGalContact && isMultipleContact && (
						<Button
							type="button"
							class={style.mobileEmail}
							icon="envelope"
							onClick={this.composeEmailForSelectedContacts}
						/>
					)}
					{!isTrashFolder && (
						<MenuItem
							class={style.mobileToolbarItem}
							icon="assign-list"
							onClick={callWith(this.showDialog, DIALOGS_ASSIGN_TO_LISTS)}
						/>
					)}

					{canRemoveFromList && (
						<MenuItem
							class={style.mobileToolbarItem}
							icon="remove-list"
							onClick={this.removeFromList}
						/>
					)}
					{isTrashFolder && !isGalContact && (
						<MenuItem
							class={style.mobileToolbarItem}
							icon="restore"
							onClick={this.restoreSelectedContacts}
						/>
					)}

					{isTrashFolder && !isGalContact && (
						<MenuItem
							class={style.mobileToolbarItem}
							icon="trash"
							onClick={callWith(this.showDialog, DIALOGS_DELETE_PERMANENT)}
						/>
					)}

					{!isTrashFolder && !isGalContact && (
						<MenuItem
							class={style.mobileToolbarItem}
							icon="trash"
							onClick={this.deleteSelectedContacts}
						/>
					)}
				</div>
			) : (
				<div class={style.mobileToolbar}>
					<Button styleType="primary" brand="primary" onClick={this.onSaveNewContact}>
						<Text id="buttons.save" />
					</Button>
					<Button styleType="default" onClick={this.closeContactEditor}>
						<Text id="buttons.cancel" />
					</Button>
				</div>
			);

		return (
			<div class={cx(style.contacts, pending && style.loading)}>
				<Sidebar header={!matchesScreenMd} inlineClass={style.sidebar}>
					{matchesScreenMd && (
						<div class={cx(style.sidebarHeader, isSidebarScrolled && style.boxShadow)}>
							<a
								class={cx(style.createNew, isOffline && style.createNewDisabled)}
								href={!isOffline && `/${urlSlug}/${folder ? folder + '/' : ''}new`}
							>
								<Text id="contacts.edit.fields.newContact" />
							</a>
						</div>
					)}
					<div class={style.sidebarListWrapper} onscroll={this.handleSidebarScroll}>
						<FolderList
							indexFolderName={CONTACTS}
							class={style.folders}
							folders={folders}
							urlSlug={urlSlug}
							view={CONTACTS_VIEW}
							dropEffect="move"
							onDrop={this.handleContactListDrop}
							badgeProp={this.getFolderBadge}
							folderNameProp={this.getFolderName}
							specialFolderList={['contacts', 'trash']}
						/>
						<div class={style.contactGroups}>
							<ContactGroupsList
								urlSlug={urlSlug}
								urlPrefix={CONTACT_GROUP_PREFIX}
								lastUpdated={lastUpdated}
								handleAfterAction={this.contactsUpdated}
								onDrop={this.handleContactListDrop}
								dropEffect="copy"
								class={style.wrapper}
							/>
							{matchesScreenMd && (
								<CreateList class={style.createContactGroup} onCreate={this.contactsUpdated} />
							)}
						</div>
					</div>
					<LeftSideAdSlot />
				</Sidebar>

				<ContactList
					searchInline={searchInline}
					class={cx(style.contactList, isAttachmentViewerOpen && style.attachmentViewerOpen)}
					contacts={(contacts.length || !pending) && contacts}
					selected={selected}
					showDeleteListButton={allowActionDeleteRenameList}
					onSelectionChange={this.setSelection}
					showDialog={this.showDialog}
					onAssignToLists={callWith(this.showDialog, DIALOGS_ASSIGN_TO_LISTS)}
					onRemoveFromList={
						canRemoveFromList && CONTACTS !== folder.name ? this.removeFromList : undefined
					}
					onDeleteContact={
						TRASH === folder
							? callWith(this.showDialog, DIALOGS_DELETE_PERMANENT)
							: this.deleteSelectedContacts
					}
					onEditDetails={this.toggleEdit}
					onContextMenuMount={this.handleContextMenuMount}
					showPermanentlyDelete={this.shouldPermanentlyDelete()}
					isDeletable={this.isDeletable()}
					isEditable={this.isEditable()}
					onShareContact={this.composeEmailForSharingContact}
					isTrashFolder={isTrashFolder}
					isSingleSelectAndDeleted={isSingleSelectAndDeleted}
				/>

				<div class={cx(style.readPane, isAttachmentViewerOpen && style.attachmentViewerOpen)}>
					<div class={style.contactViewer}>
						{view ? (
							matchesScreenMd ? (
								contactDetailInner
							) : (
								(isNew || edit || showContactDetails) && (
									<ModalDrawer
										preventCollapse={isFormDirty}
										toolbarChildren={mobileContactToolbar}
										onClickOutside={this.closeContact}
									>
										{contactDetailInnerMobile}
									</ModalDrawer>
								)
							)
						) : selectedCount === 0 ? (
							<div class={style.selectedContacts}>
								<Text id="contacts.chooseContact" />
							</div>
						) : (
							selectedCount > 1 && (
								<SelectedContactsActions
									selectedCount={selectedCount}
									totalCount={contacts.length}
									onCompose={this.composeEmailForSelectedContacts}
									onAssignToLists={callWith(this.showDialog, DIALOGS_ASSIGN_TO_LISTS)}
									onRemoveFromList={canRemoveFromList && this.removeFromList}
									onRestore={this.restoreSelectedContacts}
									onDelete={this.deleteSelectedContacts}
									showDialog={this.showDialog}
									isTrashFolder={isTrashFolder}
									isDeletable={this.isDeletable()}
									isOffline={isOffline}
								/>
							)
						)}
					</div>
					<RightSideAdSlot />
				</div>

				{dialog === DIALOGS_EXPORT && (
					<ExportContacts onClose={callWith(this.hideDialog, DIALOGS_EXPORT)} />
				)}

				{dialog === DIALOGS_IMPORT && (
					<ImportContactsFromFile
						onClose={callWith(this.hideDialog, DIALOGS_IMPORT)}
						refetchContacts={refetchContacts}
					/>
				)}

				{dialog === DIALOGS_ASSIGN_TO_LISTS && (
					<AssignToLists
						selectedContacts={contacts.filter(c => contextContactId.indexOf(getId(c)) !== -1)}
						onSave={this.assignSelectedContactsToList}
						onClose={callWith(this.hideDialog, DIALOGS_ASSIGN_TO_LISTS)}
						lastUpdated={lastUpdated}
					/>
				)}

				{dialog === DIALOGS_DELETE_LIST && (
					<DeleteList
						class={style.createContactGroup}
						folder={selectedContactGroup}
						urlSlug={urlSlug}
						urlPrefix={CONTACT_GROUP_PREFIX}
						urlSuffixProp="id"
						afterAction={this.contactsUpdated}
						onClose={callWith(this.hideDialog, DIALOGS_DELETE_LIST)}
					/>
				)}

				{dialog === DIALOGS_DELETE_PERMANENT && (
					<DeleteContactDialog
						{...this.props}
						onConfirm={this.handleConfirmPermanentDelete}
						onClose={callWith(this.hideDialog, DIALOGS_DELETE_PERMANENT)}
						permanent={isDeletedOrTrashed}
					/>
				)}

				{dialog === DIALOGS_SAVE_CHANGES && (
					<SaveContactDialog
						cancelButton={false}
						onClose={callWith(this.hideDialog, DIALOGS_SAVE_CHANGES)}
						buttons={[
							<Button styleType="primary" brand="primary" onClick={this.onConfirmClick}>
								<Text id="dialogs.saveContact.PROCEED" />
							</Button>,
							<Button onClick={this.handleDiscardChanges}>
								<Text id="dialogs.saveContact.DISCARD" />
							</Button>
						]}
					/>
				)}
				<ContactsToolbar
					searchInline={searchInline}
					onCompose={this.createContact}
					isOffline={isOffline}
					multipleContactToolBar={isMultipleContact && mobileContactToolbar}
				/>
			</div>
		);
	}
}
