import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { setDataTransferJSON } from '@zimbra/util/src/data-transfer-manager';
import * as mailItemUtils from '../../utils/mail-item';
import { isAccount } from '../../utils/account';
import { canMoveMailOutOf } from '../../utils/folders';
import get from 'lodash-es/get';
import first from 'lodash-es/first';
import { connect } from 'preact-redux';
import { clearSelected, setSelected } from '../../store/mail/actions';
import NarrowListItem from './narrow';
import WideListItem from './wide';
import ContextMenu from '../context-menu';
import { MailContextMenu } from '../context-menus';
import { withText } from 'preact-i18n';
import style from './style';
import { types as apiClientTypes } from '@zimbra/api-client';
const { MailFolderView } = apiClientTypes;

@connect(
	state => ({
		isOffline: state.network.isOffline
	}),
	{ clearSelected, setSelected }
)
@withText({
	repliedText: 'mail.preText.replied',
	forwardedText: 'mail.preText.forwarded'
})
export default class MailListItem extends Component {
	handleClick = () => {
		const { onClick, item, type } = this.props;
		onClick({ item, type });
	};

	handleDblClick = () => {
		const { onDblClick, item, type } = this.props;
		if (onDblClick) {
			onDblClick({ item, type });
		}
	};

	handleDragStart = e => {
		const { item, selectedIds, type } = this.props;
		this.props.toggleAllowedFolders(selectedIds.size > 0 ? Array.from(selectedIds) : [item]);
		setDataTransferJSON(e, {
			data: {
				type,
				ids: selectedIds.size > 0 ? Array.from(selectedIds) : [item]
			},
			itemCount: selectedIds.size > 0 ? selectedIds.size : 1
		});
	};

	messagesRef = c => {
		this.messages = c;
	};

	handleArchive = () => this.props.onArchive(true, get(this, 'props.item.id'));

	handleBlock = () => this.props.onBlock(get(this, 'props.item'));

	handleDelete = () => this.props.onDelete(get(this, 'props.item.id'));

	handleShowOriginal = () => {
		const { type, item } = this.props;
		let messageId = get(item, 'id');
		if (type === MailFolderView.conversation) {
			messageId = first(item.messagesMetaData).id;
		}
		this.props.onShowOriginal(messageId);
	};

	handlePrint = () => this.props.onPrint(get(this, 'props.item.id'));

	handleHoverClickDelete = e => {
		e.stopPropagation();
		this.props.onDelete(get(this, 'props.item.id'), true);
	};

	handleFlag = () => this.props.onFlag(true, get(this, 'props.item.id'));

	handleUnFlag = () => this.props.onFlag(false, get(this, 'props.item.id'));

	handleHoverToggleFlagged = (e, value) => {
		e.stopPropagation();
		this.props.onFlag(value, get(this, 'props.item.id'), false, true);
	};

	handleMarkRead = () => this.props.onMarkRead(true, get(this, 'props.item.id'));

	handleMarkUnread = () => this.props.onMarkRead(false, get(this, 'props.item.id'));

	handleHoverToggleUnread = (e, unread) => {
		e.stopPropagation();
		this.props.onMarkRead(!unread, get(this, 'props.item.id'), false, true);
	};

	handleCheckbox = e => {
		e.stopPropagation();
		this.props.onCheckboxSelect(get(this, 'props.item'), e);
	};

	handleClickSearch = e => {
		e.stopPropagation();
		this.props.onSearch(get(this, 'props.item'));
	};

	handleSpam = () => this.props.onMarkSpam(get(this, 'props.item'), get(this, 'props.item.id'));

	handleAddSenderToContacts = () => {
		const { item, account, type } = this.props;
		mailItemUtils.fromSenders(item, account).map(s => {
			const [firstName, lastName] = (get(s, 'name') || '').split(' ');

			return this.props.onAddToContacts(
				{
					attributes: {
						lastName,
						firstName: get(s, 'shortName') || firstName,
						email: s.address
					}
				},
				type
			);
		});
	};

	// When right-clicking on an item, if the item is not currently selected (has checkbox checked), clear
	// other selections and check the current item
	handleContextMenuMount = () => {
		const { selectedIds, item, shouldNotBeMarkedRead } = this.props;
		shouldNotBeMarkedRead();
		if (selectedIds && !Array.from(selectedIds).find(e => e.id === item.id)) {
			this.props.clearSelected();
			this.props.setSelected({ item });
		}
	};

	updateMailItemSubject = ({ subject, ...rest }) => {
		const { forwardedText, repliedText } = this.props;
		return {
			subject: subject && subject.replace(new RegExp(`${repliedText}|${forwardedText}`), '').trim(),
			...rest
		};
	};

	static propTypes = {
		onMarkRead: PropTypes.func.isRequired,
		onFlag: PropTypes.func.isRequired,
		onDelete: PropTypes.func.isRequired,
		onPrint: PropTypes.func.isRequired,
		selectedIds: PropTypes.set
	};

	renderMailListItems = () => {
		const {
			type,
			onClick,
			item,
			parentConversation,
			selectedMessage,
			showSnippet,
			isViewing,
			isSelected,
			wide,
			account,
			density,
			isOffline,
			folderName,
			selectedIds,
			repliedText,
			forwardedText,
			...rest
		} = this.props;

		const count = item.numMessages;
		const isUnread = mailItemUtils.isUnread(item);
		const isFlagged = mailItemUtils.isFlagged(item);
		const isUrgent = mailItemUtils.isUrgent(item);
		const isSentByMe = mailItemUtils.isSentByMe(item);
		const isDraft = mailItemUtils.isDraft(item, type);
		const isAttachment = mailItemUtils.isAttachment(item);
		const displayAddresses = mailItemUtils.displaySenders(item, account);
		const fromSenders = mailItemUtils.fromSenders(item, account);
		const toAddresses = mailItemUtils.displayToAddresses(item, account);
		const filteredFromAddresses = (get(item, 'emailAddresses') || []).filter(a => a.type === 'f');
		const needsToDisplay =
			folderName === 'Sent' ||
			(isDraft &&
				filteredFromAddresses.length === 1 &&
				isAccount(account, filteredFromAddresses[0]));

		const ListItem = wide ? WideListItem : NarrowListItem;

		const mailItem = type === MailFolderView.conversation ? this.updateMailItemSubject(item) : item;
		return (
			<div
				{...rest}
				class={cx(
					style[density],
					style.message,
					style.conversation,
					wide ? style.wide : style.narrow,
					parentConversation && style.conversationMessage,
					isUnread && style.unread,
					(isViewing || isSelected) && style.conversationSelected,
					(isViewing || isSelected) && style.selected,
					isUrgent && style.urgent,
					isSentByMe && style.sentByMe,
					!showSnippet && style.noSnippet
				)}
				onClick={this.handleClick}
				onDblClick={this.handleDblClick}
				onDragStart={this.handleDragStart}
				draggable={canMoveMailOutOf(folderName) ? true : 0}
			>
				<ListItem
					{...this.props}
					item={mailItem}
					count={count}
					emailAddresses={needsToDisplay ? toAddresses : displayAddresses}
					isUnread={isUnread}
					isFlagged={isFlagged}
					isUrgent={isUrgent}
					isSentByMe={isSentByMe}
					isDraft={isDraft}
					isAttachment={isAttachment}
					onCheckbox={this.handleCheckbox}
					onToggleUnread={this.handleHoverToggleUnread}
					onInlineDelete={this.handleHoverClickDelete}
					onInlineSearch={this.handleClickSearch}
					onToggleFlagged={this.handleHoverToggleFlagged}
					disableInlineSearch={fromSenders && fromSenders.length !== 1}
					showSnippet={showSnippet}
					isOffline={isOffline}
				/>
			</div>
		);
	};

	render({ onArchive, isOffline, selectedIds, item, localFolder }) {
		const menu = (
			<MailContextMenu
				onMarkRead={this.handleMarkRead}
				onMarkUnread={this.handleMarkUnread}
				onStar={this.handleFlag}
				onClearStar={this.handleUnFlag}
				onBlock={this.handleBlock}
				onMarkSpam={this.handleSpam}
				onArchive={onArchive && this.handleArchive}
				onDelete={this.handleDelete}
				onShowOriginal={this.handleShowOriginal}
				onAddSenderContacts={this.handleAddSenderToContacts}
				onPrint={this.handlePrint}
				onMount={this.handleContextMenuMount}
				selectedIds={selectedIds}
				item={item}
				isOffline={isOffline}
				folderName={this.props.folderName}
				localFolder={localFolder}
			/>
		);
		return <ContextMenu menu={menu} render={this.renderMailListItems} />;
	}
}
