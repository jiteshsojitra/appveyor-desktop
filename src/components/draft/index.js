/* eslint-disable brace-style */
import { h, Component } from 'preact';
import { route } from 'preact-router';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import { configure } from '../../config';
import { defaultProps, withProps, withState, withStateHandlers } from 'recompose';
import { generateOfflineId } from '../../utils/offline';
import debounce from 'lodash-es/debounce';
import omit from 'lodash-es/omit';
import get from 'lodash-es/get';
import cx from 'classnames';
import Composer from '../composer';
import { openModalCompose } from '../../store/email/actions';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenXsMax } from '../../constants/breakpoints';
import { DEFAULT_UNDO_DURATION } from '../../constants/undo-timeout';
import accountInfoQuery from '../../graphql-decorators/account-info/normalized-identities';
import { notify } from '../../store/notifications/actions';
import {
	getMailboxMetadata,
	withSetMailboxMetaData
} from '../../graphql-decorators/mailbox-metadata';
import s from './style.less';
import {
	withSendMessage,
	withSaveDraft,
	withDelayedSendMessage,
	withClearAutoSend
} from '../../graphql-decorators/send-message';
import withTrashMessage from '../../graphql-decorators/trash-message';
import { emojiImageToUnicode, callWith } from '../../lib/util';
import { htmlToText } from '../../lib/html-email';
import { isSMIMEFeatureAvailable } from '../../utils/license';
import { SMIME_OPERATIONS } from '../../constants/smime';
import { SMIMEDefaultSetting, SMIMELastOperation } from '../../constants/mailbox-metadata';
import smimeHandler from '@zimbra/electron-app/src/smime';
import SMIMEDialog from '../composer/smime-dialog';
import { withUploadMessage } from '../../graphql-decorators/send-message/upload-message';
import { getRecipients } from '../composer/composer';
import withDiscoverRights from '../../graphql-decorators/account-info/discover-rights';
import ModalDialog from './../modal-dialog/index';

const draftSaveDebounceSeconds = 2;

function mergeAttachments(messageA, messageB, field = 'attachments') {
	const a = messageA[field] || [],
		b = messageB[field] || [];

	return a.map(
		attachmentA =>
			b.find(
				attachmentB =>
					(attachmentA.attachmentId || attachmentB.part) &&
					attachmentA.filename === attachmentB.filename
			) || attachmentA
	);
}

@accountInfoQuery({ fetchPolicy: 'cache-first' })
@withDiscoverRights()
@configure({ urlSlugs: 'routes.slugs' })
@defaultProps({ folderName: 'Drafts' })
@withSaveDraft()
@withSendMessage()
@withTrashMessage()
@withDelayedSendMessage()
@withClearAutoSend()
@withUploadMessage()
@withMediaQuery(minWidth(screenXsMax))
@getMailboxMetadata()
@withSetMailboxMetaData()
@connect(
	null,
	dispatch => ({
		openModalCompose: props => dispatch(openModalCompose(props)),
		notify: options => dispatch(notify(options))
	})
)
@withProps(({ mailboxMetadata, accountInfo }) => {
	let smimeOperation;
	const smimeDefaultSetting = mailboxMetadata[SMIMEDefaultSetting] || SMIME_OPERATIONS.noSignOrEnc,
		smimeLastOperation = mailboxMetadata[SMIMELastOperation];

	if (smimeDefaultSetting === SMIME_OPERATIONS.rememberSettings) {
		smimeOperation = smimeLastOperation ? smimeLastOperation : SMIME_OPERATIONS.noSignOrEnc;
	} else {
		smimeOperation = smimeDefaultSetting;
	}

	return {
		smimeOperation,
		isSMIMEFeatureAvailable: isSMIMEFeatureAvailable(get(accountInfo, 'license'))
	};
})
@withState('requestReadReceipt', 'updateReadReceiptOperation', ({ accountInfo }) =>
	get(accountInfo, 'prefs.zimbraPrefMailRequestReadReceipts')
)
@withStateHandlers(
	{
		shouldShowSenderCertErrModal: false
	},
	{
		displayCertErrorModal: () => show => ({ shouldShowSenderCertErrModal: show })
	}
)
export default class Draft extends Component {
	requestId = 0;
	state = {
		draftSaved: {}
	};

	urlForMessage = id =>
		`/${this.props.urlSlugs.email}/${encodeURIComponent(this.props.folderName)}/${
			this.props.urlSlugs.message
		}/${id}`;

	handleChange = newMessageDraft => {
		this.debouncedSaveOrUpdateDraft(newMessageDraft);
	};

	saveOrUpdateDraft = (newMessageDraft, base64Message) => {
		const messageDraft = this.getMessageDraft(),
			requestId = ++this.requestId;
		const { saveDraft, onSave, requestReadReceipt } = this.props;

		if (newMessageDraft.html) {
			newMessageDraft.html = this.emojisBackToUnicode(newMessageDraft.html);
			newMessageDraft.text = htmlToText(newMessageDraft.html);
		}

		if (!messageDraft.draftId) {
			// Generate an offlineId for drafts the first time they save.
			const offlineDraftId = newMessageDraft.id || generateOfflineId();
			newMessageDraft.draftId = offlineDraftId;
			newMessageDraft.id = offlineDraftId;
		}

		const draftToSave = {
			...(messageDraft.id ? messageDraft : {}),
			...newMessageDraft
		};

		draftToSave.attachments = mergeAttachments(draftToSave, this.state.draftSaved);
		draftToSave.inlineAttachments = mergeAttachments(
			draftToSave,
			this.state.draftSaved,
			'inlineAttachments'
		);

		const { attachmentId, ...restDraftAttrs } = draftToSave;

		// Optimistically setState with the new draft
		this.setState({
			draftSaved: {
				...draftToSave,
				date: Date.now() // Optimistically set save time
			}
		});

		return saveDraft(draftToSave, base64Message, requestReadReceipt).then(({ data }) => {
			if (requestId === this.requestId) {
				const message = get(data, 'saveDraft.message.0');
				const isSMIMEMessage =
					get(message, 'attributes.isEncrypted') || get(message, 'attributes.isSigned');
				const draftSaved = {
					...message,
					...restDraftAttrs,
					date: message.date,
					...(!isSMIMEMessage && {
						attachments: mergeAttachments(restDraftAttrs, message),
						inlineAttachments: mergeAttachments(restDraftAttrs, message, 'inlineAttachments')
					}),
					id: message.id,
					draftId: message.id
				};

				this.setState({
					draftSaved
				});

				onSave && onSave(draftSaved);
			}
		});
	};

	handleDelete = () => {
		const { trashMessage, onDelete } = this.props;
		this.debouncedSaveOrUpdateDraft.cancel();

		const messageDraft = this.getMessageDraft();
		if (messageDraft.id) {
			trashMessage(messageDraft).then(() => {
				onDelete(messageDraft);
			});
		} else {
			onDelete(messageDraft);
		}
	};

	//takes an html string and converts emoji images back to their unicode (for draft saving and message sending)
	emojisBackToUnicode = html => {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const images = doc.querySelectorAll('img[emoji][alt][src*="emojione/assets"]');

		for (let i = 0; i < images.length; i++) {
			emojiImageToUnicode(images[i]);
		}

		return doc.body.innerHTML;
	};

	getMessageDraft = () => ({
		...omit(this.props.messageDraft, ['autoSendTime']),
		...this.state.draftSaved,
		draftId: this.props.messageDraft.id || this.state.draftSaved.id || this.state.draftSaved.draftId
	});

	handleMobileOverlayClicked = () => {
		this.props.openModalCompose({
			mode: 'mailTo',
			message: this.getMessageDraft()
		});
	};

	removeCertFromContacts = list =>
		list.map(({ publicCertObject, isCertificateExpired, publicCert, ...rest }) => rest);

	sendMessage = message => {
		const { confirmSend, originalMessage, originalRecipients } = this.state;
		const {
			mailboxMetadata,
			sendMessageWithDelay,
			onSend,
			notify: notifyAction,
			clearAutoSend,
			sendMessage,
			isOffline,
			requestReadReceipt
		} = this.props;

		// Show confirmation prompt if adding a new recipient via reply when there are attachments:
		if (
			confirmSend !== true &&
			originalMessage &&
			originalMessage.attachments &&
			originalMessage.attachments.length &&
			message.replyType === 'r'
		) {
			const newRecipients = getRecipients(message);
			const from = this.getFromAccount();

			for (let i = 0; i < newRecipients.length; i++) {
				const recip = newRecipients[i];
				if (recip !== from.emailAddress.toLowerCase() && originalRecipients.indexOf(recip) === -1) {
					return this.setState({ showAttachmentForwardConfirm: true });
				}
			}
		}

		message.attachments = mergeAttachments(message, this.state.draftSaved);
		message.inlineAttachments = mergeAttachments(
			message,
			this.state.draftSaved,
			'inlineAttachments'
		);

		message.to = this.removeCertFromContacts(message.to);
		message.cc = this.removeCertFromContacts(message.cc);
		message.bcc = this.removeCertFromContacts(message.bcc);

		this.setState({ loading: true });

		const messageDraft = {
			...this.getMessageDraft(),
			...message
		};

		messageDraft.html = this.emojisBackToUnicode(messageDraft.html);
		messageDraft.text = htmlToText(messageDraft.html);
		this.debouncedSaveOrUpdateDraft.cancel();

		if (mailboxMetadata && mailboxMetadata.zimbraPrefUndoSendEnabled) {
			return sendMessageWithDelay(
				messageDraft,
				DEFAULT_UNDO_DURATION * 1000,
				requestReadReceipt
			).then(({ data: { saveDraft: { message: [draftSaved] } } }) => {
				onSend && onSend();
				notifyAction({
					message: <Text id="mail.notifications.sent" />,
					action: {
						label: <Text id="buttons.undo" />,
						fn: () => {
							route(this.urlForMessage(draftSaved.id));

							clearAutoSend(draftSaved).then(() => {
								notifyAction({
									message: <Text id="mail.notifications.sendUndone" />
								});
							});
						}
					}
				});
			});
		}

		sendMessage(messageDraft, requestReadReceipt)
			.then(() => {
				notifyAction({
					message: <Text id="mail.notifications.sent" />
				});
				onSend && onSend();
				this.setState({ loading: false });
			})
			.catch(err => {
				// @TODO show toast for error
				console.warn(err);
				this.setState({
					loading: false
				});
				!isOffline &&
					notifyAction({
						message: String((err && err.message) || err).replace(/^.*(reported|Sender|soap):/g, ''),
						failure: true
					});
			});

		isOffline && onSend && onSend(); // If App is offline when "Send" message button is hit, close the composer.
	};

	encodeMessage = (message, operation, doEncrypt = false, sendMessage) => {
		const { to, cc, bcc } = message;
		const recipients = to.concat(cc, bcc);

		if (this.state.loading) return;

		if (doEncrypt && sendMessage) {
			// Check if any one recipient is missing certificate
			if (
				!recipients.every(
					recipient => recipient.publicCertObject && !recipient.isCertificateExpired
				)
			) {
				this.setState({ draftSaved: message, encryptErrorDialogText: true });
				return;
			}
		}

		this.setState({ loading: true });

		if (smimeHandler) {
			return smimeHandler({
				operation: 'encode',
				...(doEncrypt && {
					certificates: recipients
						.filter(recipient => recipient.publicCert)
						.map(recipient => recipient.publicCert)
				}),
				data: message,
				encrypt: doEncrypt,
				sign: true
			})
				.then(({ encodedMessage, base64Message }) => {
					const { uploadMessage, setMailboxMetadata } = this.props;

					uploadMessage(encodedMessage).then(result => {
						message.attachmentId = get(result, 'data.uploadMessage');

						if (sendMessage) {
							this.sendMessage(message);
							setMailboxMetadata({ [SMIMELastOperation]: operation });
						} else {
							this.saveOrUpdateDraft(message, base64Message);
						}
						this.setState({ loading: false });
					});
				})
				.catch(err => {
					console.error(err);
					this.setState({ loading: false });
					throw Error(err);
				});
		}
	};

	handleDraftOrSend = (message, sendMessage, showCertErrModal = false) => {
		const { smimeOperation } = this.state;
		const { isSMIMEFeatureAvailable: smimeFeatureAvailable, setMailboxMetadata } = this.props;

		// if SMIME enable
		if (smimeFeatureAvailable) {
			if (smimeOperation !== SMIME_OPERATIONS.noSignOrEnc) {
				const encodeMsgOpPromise = this.encodeMessage(
					message,
					smimeOperation,
					smimeOperation === SMIME_OPERATIONS.signAndEnc,
					sendMessage
				);

				if (encodeMsgOpPromise) {
					encodeMsgOpPromise.catch(() => {
						const { displayCertErrorModal, notify: notifyAction } = this.props;

						showCertErrModal
							? displayCertErrorModal(true)
							: notifyAction({
									message: <Text id="mail.notifications.signError" />,
									failure: true
							  });
					});
				}
			} else if (sendMessage) {
				this.sendMessage(message);
				setMailboxMetadata({ [SMIMELastOperation]: smimeOperation });
			} else {
				if (smimeOperation === SMIME_OPERATIONS.noSignOrEnc) {
					message.attributes = null;
				}
				this.saveOrUpdateDraft(message);
			}
		} else if (sendMessage) {
			this.sendMessage(message);
		} else {
			this.saveOrUpdateDraft(message);
		}
	};

	handleSaveOrUpdateDraft = message => {
		this.handleDraftOrSend(message, false);
	};

	handleSend = message => {
		this.handleDraftOrSend(message, true, true);
	};

	handleSMIMEOperation = (message, op) => {
		this.setState({ smimeOperation: op }, () => this.handleSaveOrUpdateDraft(message));
	};

	handleChangeInReadReceiptOperation = op => this.props.updateReadReceiptOperation(op);

	handleEncryptionErrorClose = () => {
		this.setState({ encryptErrorDialogText: null });
	};

	debouncedSaveOrUpdateDraft = debounce(
		this.handleSaveOrUpdateDraft,
		1000 * draftSaveDebounceSeconds
	);

	componentWillMount() {
		const { smimeOperation, message } = this.props;
		const isSigned = get(message, 'attributes.isSigned');
		const isEncrypted = get(message, 'attributes.isEncrypted');

		if (isEncrypted) {
			this.setState({ smimeOperation: SMIME_OPERATIONS.signAndEnc });
		} else if (isSigned) {
			this.setState({ smimeOperation: SMIME_OPERATIONS.sign });
		} else if (message && (message.id || message.draftId)) {
			this.setState({ smimeOperation: SMIME_OPERATIONS.noSignOrEnc });
		} else {
			this.setState({ smimeOperation });
		}
	}

	componentWillReceiveProps(nextProps) {
		if (get(this.props, 'messageDraft.id') !== get(nextProps, 'messageDraft.id')) {
			this.setState({ draftSaved: {} });
		}
	}

	componentWillUnmount() {
		this.debouncedSaveOrUpdateDraft.cancel();
	}

	render(
		{
			accounts,
			autofocus,
			autofocusTarget,
			onCancel,
			inline,
			matchesMediaQuery,
			class: cls,
			srcFolder,
			notify: notifyAction,
			isSMIMEFeatureAvailable: isSMIMEAvailable,
			replyLocalFolder,
			requestReadReceipt,
			delegatedRights,
			shouldShowSenderCertErrModal,
			displayCertErrorModal
		},
		{ encryptErrorDialogText, loading, smimeOperation }
	) {
		return (
			<div className={cx(s.wrapper, cls, inline && s.inlineWrapper)}>
				<Composer
					accounts={accounts}
					autofocus={autofocus}
					delegatedRights={delegatedRights}
					autofocusTarget={autofocusTarget}
					inline={inline}
					message={this.getMessageDraft()}
					onChange={this.handleChange}
					onCancel={onCancel}
					onDelete={this.handleDelete}
					onSend={this.handleSend}
					srcFolder={srcFolder}
					notify={notifyAction}
					smimeOperation={smimeOperation}
					onChangeSmimeOperation={this.handleSMIMEOperation}
					isSMIMEFeatureAvailable={isSMIMEAvailable}
					requestReadReceipt={requestReadReceipt}
					onChangeReadReceiptOperation={this.handleChangeInReadReceiptOperation}
					loading={loading}
					replyLocalFolder={replyLocalFolder}
				/>
				{!matchesMediaQuery && inline && (
					<div class={s.mobileOverlay} onClick={this.handleMobileOverlayClicked} />
				)}
				{encryptErrorDialogText && (
					<SMIMEDialog
						dialogTitle="dialogs.encryptError.title"
						actionText="buttons.ok"
						textId="dialogs.encryptError.recipientError"
						onAction={this.handleEncryptionErrorClose}
						onClose={this.handleEncryptionErrorClose}
						cancelButton={false}
					/>
				)}
				{shouldShowSenderCertErrModal && (
					<ModalDialog
						title="smime.senderCertErrorModal.certNotFoundTitle"
						actionLabel="buttons.ok"
						cancelButton={false}
						onAction={callWith(displayCertErrorModal, false)}
						onClose={callWith(displayCertErrorModal, false)}
					>
						<div class={s.header}>
							<Text id="smime.senderCertErrorModal.certNotFoundDesc" />
						</div>
					</ModalDialog>
				)}
			</div>
		);
	}
}
