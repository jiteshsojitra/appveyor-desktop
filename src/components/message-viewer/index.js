import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { route } from 'preact-router';
import { Text } from 'preact-i18n';
import cx from 'classnames';

import { FORWARD, REPLY, REPLY_ALL } from '../../constants/mail';
import { message as messageType } from '../../constants/types';

import {
	isFlagged as isFlaggedUtil,
	isUnread as isUnreadUtil,
	isDraft as isDraftUtil,
	isMessageToBeReplied,
	isSMIMEMessage,
	isEncryptedMessage
} from '../../utils/mail-item';
import draftForMessage from '../../utils/draft-for-message';
import registerTab from '../../enhancers/register-tab';
import SMIMEViewer from '../viewer/SMIMEViewer';
import ViewerTitle from '../viewer-title';
import { generateOfflineId } from '../../utils/offline';
import { notify } from '../../store/notifications/actions';
import s from './style.less';
import withAccountInfo from '../../graphql-decorators/account-info';
import { withSaveDraft } from '../../graphql-decorators/send-message';
import { getAccountToAddressForId } from '../../utils/account';
import get from 'lodash-es/get';
import smimeHandler from '@zimbra/electron-app/src/smime';
import { withUploadMessage } from '../../graphql-decorators/send-message/upload-message';
import { configure } from '../../config';

@registerTab(
	props =>
		props.wide && {
			type: 'message',
			id: props.message.id,
			title: props.message.subject
		}
)
@connect(({ activeAccount }) => ({ activeAccount }))
@connect(
	state => ({
		activeAccount: get(state, 'activeAccount'),
		isOffline: get(state, 'network.isOffline')
	}),
	{ notify }
)
@withSaveDraft()
@withAccountInfo()
@withUploadMessage()
@configure({ localFolderSlug: 'routes.slugs.localFolder', messageSlug: 'routes.slugs.message' })
export default class MessageViewer extends Component {
	encode = (message, doEncrypt = false) => {
		if (smimeHandler) {
			smimeHandler({
				operation: 'encode',
				...(doEncrypt && {
					certificates: []
				}),
				data: message,
				encrypt: doEncrypt,
				sign: true
			})
				.then(({ encodedMessage, base64Message }) => {
					const { uploadMessage } = this.props;

					uploadMessage(encodedMessage).then(result => {
						message.attachmentId = get(result, 'data.uploadMessage');

						this.saveDraft(message, base64Message);
					});
				})
				.catch(err => {
					console.error(err);

					const { notify: notifyAction } = this.props;
					notifyAction({
						message: <Text id="mail.notifications.signError" />,
						failure: true
					});
				});
		}
	};

	createDraft = (type, message) => {
		const { account, localFolder, activeAccount } = this.props;
		const draft = draftForMessage(
			type,
			message || this.props.message,
			getAccountToAddressForId(account, activeAccount.id)
		);

		// when reply/forward originages from sent folder mail, need to check for the from addresses
		if (!draft.from.length) {
			draft.from = (message || this.props.message).from;
		}

		// Since we aren't manipulating or viewing the draft before it gets saved,
		// make sure the right content is passed along for inline images
		const dom = new DOMParser().parseFromString(draft.html, 'text/html');
		draft.inlineAttachments.forEach(({ contentId }) => {
			const image = dom.querySelector(`img[data-cid="${contentId}"]`);
			image.setAttribute('src', `cid:${contentId}`);
			image.removeAttribute('data-cid');
		});

		const signatureId = get(
			account,
			'identities.identity[0]._attrs.zimbraPrefForwardReplySignatureId'
		);

		draft.html = dom.body.innerHTML;

		if (signatureId) {
			const signature = (get(account, 'signatures.signature') || []).find(
				sig => sig.id === signatureId
			);
			if (signature) {
				draft.html = `${get(signature, 'content.0._content') || ''} <br><br> ${draft.html}`;
			}
		} else {
			draft.html = `${draft.html}`;
		}

		if (isSMIMEMessage(message)) {
			this.encode(draft, isEncryptedMessage(message), type);
		} else {
			if (localFolder) {
				draft.id = null;
				draft.origId = null;
				draft.conversationId = null;
			}
			this.saveDraft(draft);
		}
	};

	saveDraft = (message, base64Message) => {
		const { isOffline, localFolder, localFolderSlug, messageSlug } = this.props;

		if (!isOffline) {
			this.props.saveDraft(message, base64Message).then(res => {
				const messageId = get(res, 'data.saveDraft.message[0].id');
				route(
					localFolder
						? `/${messageSlug}/${localFolderSlug}/${messageId}`
						: `/${messageSlug}/${messageId}`
				);
			});
		} else {
			// Generate an offlineId for drafts the first time they save.
			message.draftId = generateOfflineId();

			this.props.saveDraft(message);

			route(`/message/${message.draftId}`);
		}
	};

	handleReply = message => this.createDraft(REPLY, message);
	handleReplyAll = message => this.createDraft(REPLY_ALL, message);
	handleForward = message => this.createDraft(FORWARD, message);

	handlePrint = message => {
		const { print } = this.props;
		print([message]);
	};

	handleEventBindings(fn) {
		fn(REPLY, this.handleReply);
		fn(REPLY_ALL, this.handleReplyAll);
		fn(FORWARD, this.handleForward);
	}

	handleRead = (e, unread) => {
		e.stopPropagation();
		this.props.onMarkRead && this.props.onMarkRead(!unread, this.props.message.id);
	};

	handleFlag = e => {
		e.stopPropagation();
		this.props.onFlag && this.props.onFlag(!this.isFlagged, this.props.message.id);
	};

	componentDidMount() {
		this.handleEventBindings(this.props.events.on);
	}

	componentWillUnmount() {
		this.handleEventBindings(this.props.events.off);
	}

	render({
		message,
		onSaveDraft,
		onCancelDraft,
		localFolder,
		replyLocalFolder,
		wide,
		onDeleteDraft,
		onSend,
		srcFolder
	}) {
		this.isFlagged = isFlaggedUtil(message);
		const isUnread = isUnreadUtil(message);
		const isDraft = isDraftUtil(message, messageType);

		return (
			<div class={cx(s.container, wide ? s.wide : s.narrow)}>
				<ViewerTitle
					subject={message.subject}
					isFlagged={this.isFlagged}
					isUnread={isUnread}
					onStar={this.handleFlag}
					onMarkRead={this.handleRead}
					localFolder={localFolder}
				/>
				{isDraft ? (
					<SMIMEViewer
						message={message}
						key={`d_${message && (message.id || message.draftId)}`}
						onDelete={onDeleteDraft}
						onSend={onSend}
						onSave={onSaveDraft}
						onCancel={onCancelDraft}
						autofocus
						autofocusTarget={!isUnread && isMessageToBeReplied(message) ? 'body' : null}
						srcFolder={srcFolder}
						isDraft
						afterSendMessage={onSaveDraft}
						replyLocalFolder={replyLocalFolder}
					/>
				) : (
					<SMIMEViewer
						{...this.props}
						onReply={this.handleReply}
						onReplyAll={this.handleReplyAll}
						onForward={this.handleForward}
						onPrint={this.handlePrint}
						disableReadIcon
						disableStarIcon
						localFolder={localFolder}
					/>
				)}
			</div>
		);
	}
}
