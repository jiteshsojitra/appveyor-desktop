import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import get from 'lodash/get';
import find from 'lodash/find';
import { Icon } from '@zimbra/blocks';
import EmailTime from '../email-time';
import StarIcon from '../star-icon';
import UnreadControl from '../unread-control';
import cx from 'classnames';
import wire from 'wiretie';
import { getId, pluck, hasFlag } from '../../lib/util';
import style from './style';
import { types as apiClientTypes } from '@zimbra/api-client';
import { USER_FOLDER_IDS } from '../../constants';

const { ActionTypeName } = apiClientTypes;

function getFrom(message) {
	const from = find(message.emailAddresses, ['type', 'f']);
	return from && (from.name || from.address);
}

function isSelected(message, selectedMessage) {
	return (
		selectedMessage &&
		(getId(selectedMessage) === getId(message) ||
			(message.messages && !!pluck(message.messages, 'id', selectedMessage.id)))
	);
}

@wire('zimbra', ({ message, selectedMessage }) => {
	const map = {
		conversationFull: null
	};
	if (
		selectedMessage &&
		message &&
		isSelected(message, selectedMessage) &&
		message.messages &&
		message.messages.length > 1
	) {
		if (!message.messages[0].excerpt && !message.messages[0].subject) {
			map.conversationFull = ['conversations.read', message.id];
		}
	}
	return map;
})
@connect(state => ({
	trashFolder: get(state, 'trashFolder.folderInfo')
}))
export default class CondensedMessage extends Component {
	handleClick = () => {
		const { onClick, message } = this.props;
		onClick({ message });
	};

	messagesRef = c => {
		this.messages = c;
	};

	handleStarClick = () => {
		this.props.onFlag(
			!this.isFlagged(),
			this.props.message.id,
			false,
			false,
			ActionTypeName.MsgAction
		);
	};

	handleReadStatusClicked = () => {
		this.props.onMarkRead(
			this.isUnread(),
			this.props.message.id,
			false,
			false,
			ActionTypeName.MsgAction
		);
	};

	isFlagged = () => hasFlag(this.props.message, 'flagged');

	isUnread = () => hasFlag(this.props.message, 'unread');

	// unselected -> selected triggers open animation
	componentDidUpdate(prevProps) {
		const m = this.props.message;
		if (m && m.messages && m.messages.length > 1) {
			const selected = isSelected(m, this.props.selectedMessage),
				prev = isSelected(prevProps.message, prevProps.selectedMessage);
			if (selected !== prev) {
				this.base.style.height =
					selected && this.messages
						? this.messages.offsetTop + this.messages.offsetHeight + 'px'
						: '';
			}
		}
	}

	componentWillUnmount() {
		this.base && (this.base.style.height = '');
	}

	render({
		message,
		conversation,
		conversationFull,
		selectedMessage,
		showExcerpt,
		matchesScreenXs,
		isTrashSubFolder
	}) {
		const messages = (conversationFull && conversationFull.messages) || message.messages,
			count = messages ? messages.length : 0,
			isConversation = count > 1,
			selected = isSelected(message, selectedMessage),
			from = getFrom(message) || ' ';

		const isUnread = hasFlag(message, 'unread');

		const isTrashMail =
			isTrashSubFolder ||
			(message.folderId && message.folderId === USER_FOLDER_IDS.TRASH.toString()) ||
			message.folderId === get(this.props, 'trashFolder.id');

		return (
			<div
				class={cx(
					style.message,
					conversation && style.conversationMessage,
					isConversation && style.conversation,
					isUnread && style.unread,
					isConversation && !messages && style.loading,
					isTrashMail && style.trashedMail,
					selected && getId(message) !== getId(selectedMessage) && style.conversationSelected,
					getId(message) === getId(selectedMessage) && style.selected,
					hasFlag(message, 'urgent') && style.urgent,
					hasFlag(message, 'sentByMe') && style.sentByMe
				)}
				onClick={this.handleClick}
			>
				<StarIcon
					class={style.star}
					onClick={this.handleStarClick}
					starred={this.isFlagged()}
					size="md"
				/>
				<UnreadControl
					class={cx(style.readStatus, style.hideXsDown)}
					onChange={this.handleReadStatusClicked}
					value={isUnread}
					visible
				/>
				<div class={style.info}>
					<div class={style.sender}>{from}</div>
					<div class={style.excerpt}>{(showExcerpt !== false && message.excerpt) || ' '}</div>
				</div>
				<div class={style.indicators}>
					{hasFlag(message, 'attachment') && (
						<Icon name="paperclip" class={style.indicator} size={matchesScreenXs ? 'md' : 'sm'} />
					)}
				</div>
				<EmailTime time={message.date} class={style.time} />
			</div>
		);
	}
}
