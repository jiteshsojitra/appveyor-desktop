import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import { connect } from 'preact-redux';
import cx from 'classnames';
import includes from 'lodash-es/includes';
import find from 'lodash-es/find';
import findIndex from 'lodash-es/findIndex';
import orderBy from 'lodash-es/orderBy';
import takeWhile from 'lodash-es/takeWhile';
import SMIMEViewer from '../viewer/SMIMEViewer';
import ViewerTitle from '../viewer-title';
import CondensedMessage from '../condensed-message';
import CondensedMessageOverflowIndicator from '../condensed-message-overflow-indicator';
import { hasFlag, last } from '../../lib/util';
import { isAutoSendDraftMessage } from '../../utils/drafts';
import draftForMessage from '../../utils/draft-for-message';
import { isMessageToBeReplied } from '../../utils/mail-item';
import { FORWARD, REPLY, REPLY_ALL } from '../../constants/mail';
import { minWidth, screenXs, screenMd, screenSm } from '../../constants/breakpoints';
import { openModalCompose } from '../../store/email/actions';
import registerTab from '../../enhancers/register-tab';
import withMediaQuery from '../../enhancers/with-media-query';
import style from './style';
import withAccountInfo from '../../graphql-decorators/account-info';
import { getAccountToAddressForId } from '../../utils/account';
import get from 'lodash-es/get';

@registerTab(
	props =>
		props.wide && {
			type: 'conversation',
			id: props.conversation.id,
			title: props.conversation.subject
		}
)
@connect(
	({ activeAccount }) => ({
		activeAccount
	}),
	{ openModalCompose }
)
@withMediaQuery(minWidth(screenXs), 'matchesScreenXs')
@withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@withAccountInfo()
export default class ConversationViewer extends Component {
	state = {
		expandedMessages: [],
		draftMessage: null,
		expandedConversations: []
	};

	handleExpandedMessageHeaderClick = message => {
		this.toggleExpandedForMessage(message);
	};

	handleCondensedMessageClick = ({ message }) => {
		this.toggleExpandedForMessage(message);
	};

	handleExpandMessages = messages => {
		messages.forEach(message => this.toggleExpandedForMessage(message));
	};

	handleCondensedConversationClick = () => {
		this.setState({
			expandedConversations: [...this.state.expandedConversations, this.props.conversation.id]
		});
	};

	handleReply = message => this.createDraft(REPLY, message);

	handleReplyAll = message => this.createDraft(REPLY_ALL, message);

	handleForward = message => this.createDraft(FORWARD, message);

	handlePrint = message => {
		const { print } = this.props;
		print([message]);
	};

	createDraft = (type, message) => {
		const { conversation, matchesScreenSm } = this.props;
		const { draftMessage } = this.state;
		const existingDraft =
			(draftMessage && draftMessage.origId === message.id.toString()) ||
			find(conversation.messages, m => hasFlag(m, 'draft') && m.origId === message.id);

		if (!existingDraft) {
			const draft = draftForMessage(
				type,
				message,
				getAccountToAddressForId(this.props.account, this.props.activeAccount.id)
			);

			if (matchesScreenSm) {
				this.setState({
					draftMessage: draft
				});
			} else {
				this.props.openModalCompose({
					mode: 'mailTo',
					message: draft
				});
			}
		}
	};

	toggleExpandedForMessage = message => {
		const { expandedMessages } = this.state;
		if (includes(expandedMessages, message.id)) {
			this.setState({
				expandedMessages: expandedMessages.filter(id => id !== message.id)
			});
			return;
		}

		this.setState({
			expandedMessages: [...expandedMessages, message.id]
		});
	};

	isFlagged = () => this.props.conversation && hasFlag(this.props.conversation, 'flagged');

	isUnread = () => this.props.conversation && hasFlag(this.props.conversation, 'unread');

	handleStarClick = () => {
		this.props.onFlag(!this.isFlagged(), this.props.conversation.id);
	};

	handleReadStatusClicked = () => {
		this.props.onMarkRead(this.isUnread(), this.props.conversation.id);
	};

	removeDraft = () => {
		this.setState({
			draftMessage: null
		});
	};

	handleDeleteDraft = messageDraft => {
		if (messageDraft.id) {
			// server draft
			this.props.onDeleteDraft();
		}
		this.removeDraft(messageDraft);
	};

	handleSendDraft = messageDraft => {
		this.props.onSend();
		this.removeDraft(messageDraft);
	};

	setExpandedMessages({ conversation }) {
		const lastMessage = conversation && last(conversation.messages);
		if (!lastMessage) {
			return;
		}

		const { expandedMessages } = this.state;

		if (expandedMessages.length === 0 || lastMessage.id !== this.props.conversation.id) {
			this.setState({
				expandedMessages: [...expandedMessages, lastMessage.id]
			});
		}
	}

	sortedMessagesAndDrafts = () => {
		const {
				conversation: { messages }
			} = this.props,
			{ draftMessage } = this.state,
			includesDraftMessage =
				draftMessage && messages.find(message => message.id === draftMessage.id),
			messageList = includesDraftMessage || !draftMessage ? messages : [...messages, draftMessage];

		// it will be used at time of rerendring cycle of component
		// so that every SMIMEViewer component could be distinguished
		messageList.forEach((m, i) => {
			m.key = m.flags && m.flags.indexOf('d') > -1 ? `d_${i}` : `m_${i}`;
			return m;
		});
		return orderBy(messageList, [
			m => {
				const parentMessage = m.origId
					? find(messages, ({ id }) => id.toString() === m.origId.toString())
					: null;
				return parentMessage ? parentMessage.date : m.date;
			},
			m => {
				// Makes room for inline drafts in the sequence of ids
				const indexMultiplier = 2;
				const parentMessageIndex = m.origId
					? findIndex(messages, ({ id }) => id.toString() === m.origId.toString()) *
							indexMultiplier +
					  1
					: findIndex(messages, ({ id }) => id.toString() === m.id.toString()) * indexMultiplier;
				return parentMessageIndex;
			}
		]);
	};

	getLastNonDraftMessage = () =>
		last(this.sortedMessagesAndDrafts().filter(m => !hasFlag(m, 'draft')));

	handleToolbarReply = () => this.createDraft(REPLY, this.getLastNonDraftMessage());

	handleToolbarReplyAll = () => this.createDraft(REPLY_ALL, this.getLastNonDraftMessage());

	handleToolbarForward = () => this.createDraft(FORWARD, this.getLastNonDraftMessage());

	handleEventBindings(fn) {
		fn(REPLY, this.handleToolbarReply);
		fn(REPLY_ALL, this.handleToolbarReplyAll);
		fn(FORWARD, this.handleToolbarForward);
	}

	handleSaveDraft = savedDraft => {
		savedDraft &&
			this.setState({
				draftMessage: savedDraft
			});
	};

	static propTypes = {
		conversation: PropTypes.object.isRequired,
		onConversationRead: PropTypes.func.isRequired
	};

	componentWillMount() {
		this.setExpandedMessages(this.props);
	}

	componentDidMount() {
		this.handleEventBindings(this.props.events.on);
	}

	componentWillReceiveProps(nextProps) {
		this.setExpandedMessages(nextProps);
		if (get(nextProps, 'conversation.id') !== get(this.props, 'conversation.id')) {
			this.setState({ draftMessage: null });
		}
	}

	componentWillUnmount() {
		this.handleEventBindings(this.props.events.off);
	}

	renderMessageList(messages) {
		const {
			matchesScreenMd,
			matchesScreenXs,
			isTrashSubFolder,
			onFlag,
			onMarkRead,
			onSaveDraft
		} = this.props;
		const { expandedMessages } = this.state;
		return messages.map(message =>
			hasFlag(message, 'draft') && !isAutoSendDraftMessage(message) ? (
				<SMIMEViewer
					autofocus={!message.id /* focus draft if it's client side */}
					autofocusTarget={isMessageToBeReplied(message) ? 'body' : null}
					message={message}
					onDelete={this.handleDeleteDraft}
					onSave={this.handleSaveDraft}
					onSend={this.handleSendDraft}
					onCancel={this.props.onCancelDraft}
					inline
					srcFolder={this.props.srcFolder}
					isDraft
					key={message.key}
					afterSendMessage={onSaveDraft}
				/>
			) : includes(expandedMessages, message.id) ? (
				<SMIMEViewer
					{...this.props}
					message={message}
					messageFull={message}
					onHeaderClick={this.handleExpandedMessageHeaderClick}
					onReply={this.handleReply}
					onReplyAll={this.handleReplyAll}
					onForward={this.handleForward}
					onPrint={this.handlePrint}
					inline
					focus
					isConversation
				/>
			) : (
				<CondensedMessage
					message={message}
					onClick={this.handleCondensedMessageClick}
					matchesScreenMd={matchesScreenMd}
					matchesScreenXs={matchesScreenXs}
					isTrashSubFolder={isTrashSubFolder}
					onFlag={onFlag}
					onMarkRead={onMarkRead}
					key={message.key}
				/>
			)
		);
	}

	renderTruncatedMessageList(messages) {
		const { matchesScreenMd, matchesScreenXs, isTrashSubFolder, onFlag, onMarkRead } = this.props;
		const { expandedMessages } = this.state;
		const condensedMessages = takeWhile(
			messages,
			message => !includes(expandedMessages, message.id)
		);
		const messageList = [
			// render the initial condensed message
			condensedMessages.length && (
				<CondensedMessage
					message={condensedMessages[0]}
					onClick={this.handleCondensedMessageClick}
					matchesScreenMd={matchesScreenMd}
					matchesScreenXs={matchesScreenXs}
					isTrashSubFolder={isTrashSubFolder}
					onFlag={onFlag}
					onMarkRead={onMarkRead}
				/>
			),
			// render overflow count, button
			condensedMessages.length >= 2 && (
				<CondensedMessageOverflowIndicator
					count={condensedMessages.slice(1).length}
					onClick={this.handleCondensedConversationClick}
				/>
			),
			// render the rest of the conversation normally
			...this.renderMessageList(messages.slice(condensedMessages.length))
		];
		return messageList.filter(Boolean);
	}

	render({ conversation, matchesScreenMd, matchesScreenSm }, { expandedConversations }) {
		return (
			<section class={cx(style.section, style.awide ? style.wide : style.narrow)}>
				<ViewerTitle
					subject={conversation.subject}
					count={conversation.messages.length}
					isFlagged={this.isFlagged()}
					isUnread={this.isUnread()}
					onStar={this.handleStarClick}
					onMarkRead={this.handleReadStatusClicked}
					matchesScreenMd={matchesScreenMd}
					matchesScreenSm={matchesScreenSm}
				/>
				{includes(expandedConversations, conversation.id)
					? this.renderMessageList(this.sortedMessagesAndDrafts())
					: this.renderTruncatedMessageList(this.sortedMessagesAndDrafts())}
			</section>
		);
	}
}
