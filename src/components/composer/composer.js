/* eslint-disable new-cap */
import { h, Component } from 'preact';
import cx from 'classnames';
import { withText, Text, MarkupText, Localizer } from 'preact-i18n';
import { Button, Icon, Select, Option } from '@zimbra/blocks';
import { shallowEqual } from '../../lib/pure-component';
import { withAriaId } from '@zimbra/a11y';
import linkstate from 'linkstate';
import Textarea from '../gui-textarea';
import RichTextArea from '../gui-rich-text-area';
import MediaMenu from '../media-menu';
import { connect } from 'preact-redux';
import { setPreviewAttachment } from '../../store/attachment-preview/actions';
import {
	toggle as toggleMediaMenu,
	hide as hideMediaMenu,
	selectTab,
	clearBuffer,
	setActiveEditor,
	unsetActiveEditor
} from '../../store/media-menu/actions';
import { recentlyActiveMediaMenu } from '../../store/media-menu/selectors';
import ConfirmAttachmentForwardDialog from './confirm-attachment-forward-dialog';
import AddressField from '../address-field';
import ComposerToolbar from '../composer-toolbar';
import ActionMenuComposeAttachments from '../action-menu-compose-attachments';
import chooseFiles from 'choose-files';
import wire from 'wiretie';
import get from 'lodash-es/get';
import partition from 'lodash-es/partition';
import filter from 'lodash-es/filter';
import find from 'lodash-es/find';
import {
	addNodeDeleteHandler,
	htmlToText,
	getEmailHTMLDocument,
	insertAtCaret,
	findElementByIdInEmail,
	placeCaretAfterElement,
	findElementParent,
	getCharacterPrecedingCaret
} from '../../lib/html-email';
import { STRIP_ATTRS, STRIP_NODES } from '../../lib/html-viewer';
import { downloadFile, readFile } from '../../lib/file';
import {
	removeNode,
	getId,
	withoutStrings,
	addFlag,
	emojiImageToUnicode,
	parseAddress,
	isValidEmail,
	hasFlag
} from '../../lib/util';
import array from '@zimbra/util/src/array';
import { isAttachmentDisposition } from '../../utils/attachments';
import { getPrimaryEmail } from '../../utils/contacts';
import { getPrimaryAccount } from '../../utils/account';
import { isOfflineId } from './../../utils/offline';
import { USER_FOLDER_IDS } from '../../constants';
import { minWidth, screenMd } from '../../constants/breakpoints';
import SMIMEDialog from './smime-dialog';
import {
	TEXT_MODE,
	HTML_MODE,
	PREVIOUS_MAIL_DONT_SHOW,
	PREVIOUS_MAIL_SHOW_ORIGINAL,
	PREVIOUS_MAIL_SHOW_LAST
} from '../../constants/composer';
import { SEND_AS, SEND_ON_BEHALF } from '../../constants/rights';
import { OUTBOX, DRAFTS } from '../../constants/folders';
import withMediaQuery from '../../enhancers/with-media-query';
import LinkCard from './vhtml-templates/link-card';
import EnhancedLinkCard, {
	CARD_SIZE,
	CARD_LOCATION
} from './vhtml-templates/enhanced-link-card/link-card';
import FooterLinks from './vhtml-templates/enhanced-link-card/footer-links';
import Img from './vhtml-templates/img';
import EmojiImg from './vhtml-templates/emoji-img';
import BitmojiImg from './vhtml-templates/bitmoji-img';
import SignatureCard from './vhtml-templates/signature-card';
import cloneDeep from 'lodash-es/cloneDeep';
import style from './style';
import { SMIMEOperationDropDown } from './smime-operation-dropdown';
import { ReadReceiptsDropDown } from './read-receipts-dropdown';
import { notify } from '../../store/notifications/actions';
import { showNotificationModal } from '../../store/notification-modal/actions';
import { SMIME_OPERATIONS } from '../../constants/smime';
import { types as apiClientTypes } from '@zimbra/api-client';
import ModalDialog from '../modal-dialog';
import { closeCompose } from '../../store/email/actions';
import { route } from 'preact-router';
import { removeTab } from '../../store/navigation/actions';
import { withPropsOnChange } from 'recompose';

const { MessageFlags, MailFolderView } = apiClientTypes;

const CLEAN = {
	to: [],
	cc: [],
	bcc: [],
	subject: '',
	body: '',
	draftId: undefined,
	showCc: false,
	originalMessage: null,
	attachments: [],
	inlineAttachments: [],
	confirmSend: null,
	showAttachmentForwardConfirm: false,
	uploadingFileList: []
};

const CONTENT_DISPOSITION_INLINE = 'inline';

const EDITOR_STYLESHEET = `
	html, body {
		font: 14px/1.3 'Helvetica Neue', Roboto, arial, helvetica, verdana, sans-serif;
	}
`;

let cidCounter = Math.floor(Math.random() * 9999);

function updateInlineAttachmentPartNumber(doc, { contentId, part }) {
	const img = doc && doc.querySelector(`[data-cid="${contentId}"]`);
	if (!img) {
		console.warn(`Attachment cid:${contentId} not found`);
		return;
	}
	img.setAttribute('src', img.src.replace(/part=(\d\.?)+/, `part=${part}`));
}

function generateNextCID() {
	return Date.now().toString(32) + (++cidCounter).toString(32) + '@zimbra';
}

function fixImageUrl(body, inlineAttachments) {
	inlineAttachments = inlineAttachments || [];
	// Replace CID references of inlineAttachments with URLs, and set the
	// CID as a data attribute.
	inlineAttachments.forEach(({ contentId, url }) => {
		body = body.replace(`src="cid:${contentId}"`, `src="${url}" data-cid="${contentId}"`);
	});

	return body;
}

export const getRecipients = (message, fields) =>
	(fields || ['to', 'cc', 'bcc'])
		.reduce((acc, field) => {
			const recipients = message[field];
			let address;
			if (recipients) {
				recipients.forEach(recipient => {
					if (recipient) {
						address =
							typeof recipient === 'string'
								? recipient
								: getPrimaryEmail(recipient) || recipient.address || '';
						if (address && isValidEmail(address)) {
							acc.push(address.toLowerCase());
						}
					}
				});
			}
			return acc;
		}, [])
		.sort();

@withAriaId('composer')
@withText({
	textareaPlaceholder: 'compose.textarea.placeholder',
	toLabel: 'compose.to',
	ccLabel: 'compose.cc',
	bccLabel: 'compose.bcc'
})
@connect(
	(state, ownProps) => ({
		activeAccountId: get(state, 'activeAccount.id'),
		showMediaMenu: get(state, 'mediaMenu.visible'),
		mediaBuffer: get(state, 'mediaMenu.buffer'),
		isRecentlyActive: recentlyActiveMediaMenu(state) === ownProps.a11yId,
		isOffline: get(state, 'network.isOffline')
	}),
	{
		toggleMediaMenu,
		hideMediaMenu,
		selectTab,
		clearMediaBuffer: clearBuffer,
		setActiveEditor,
		unsetActiveEditor,
		setPreviewAttachment,
		notify,
		showNotificationModal,
		closeCompose,
		removeTab
	}
)
@wire('zimbra', null, zimbra => ({
	// @TODO
	attach: zimbra.messages.attach,
	linkEnhancer: zimbra.linkEnhancer
}))
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@withPropsOnChange(
	['delegatedRights', 'matchesScreenMd', 'accounts'],
	({ delegatedRights, matchesScreenMd, accounts }) => {
		const fromOptions = accounts.map(({ id, fromDisplay, emailAddress }) => ({
			value: id,
			label: fromDisplay ? (
				matchesScreenMd ? (
					<span>
						{fromDisplay} &lt;{emailAddress}&gt;
					</span>
				) : (
					fromDisplay
				)
			) : matchesScreenMd ? (
				emailAddress
			) : (
				emailAddress.split('@')[0]
			)
		}));
		const delegatedRightsTargets = get(delegatedRights, 'targets');
		if (delegatedRightsTargets && delegatedRightsTargets.length > 0) {
			delegatedRightsTargets.forEach(({ target, right }) => {
				target.forEach(targetedaccount => {
					const targetEmailAddress = get(targetedaccount, 'email[0].emailAddress');
					const targetName = targetedaccount.displayName || targetEmailAddress.split('@')[0];
					const sendAsTextWithEmailAddress = (
						<MarkupText
							id="compose.sendAsTextWithEmailAddress"
							fields={{ fromAccountName: targetName, emailAddress: targetEmailAddress }}
						/>
					);
					const sendAsTextWithName = (
						<MarkupText id="compose.sendAsTextWithName" fields={{ fromAccountName: targetName }} />
					);
					const newFromOption = {
						value: targetEmailAddress + '(' + SEND_AS + ')',
						label: matchesScreenMd ? sendAsTextWithEmailAddress : sendAsTextWithName
					};

					if (right === SEND_ON_BEHALF) {
						const { fromDisplay, emailAddress } = accounts[0];
						const primaryAccountName = fromDisplay || emailAddress.split('@')[0];
						const onBehalfOfTextWithEmailAddress = (
							<MarkupText
								id="compose.onBehalfOfTextWithEmailAddress"
								fields={{
									fromAccountName: targetName,
									fromDisplay: primaryAccountName,
									emailAddress: targetEmailAddress
								}}
							/>
						);
						const onBehalfOfTextWithName = (
							<MarkupText
								id="compose.onBehalfOfTextWithName"
								fields={{ fromAccountName: targetName, fromDisplay: primaryAccountName }}
							/>
						);
						(newFromOption.value = targetEmailAddress + '(' + SEND_ON_BEHALF + ')'),
							(newFromOption.label = matchesScreenMd
								? onBehalfOfTextWithEmailAddress
								: onBehalfOfTextWithName);
					}
					fromOptions.push(newFromOption);
				});
			});
		}
		return { fromOptions };
	}
)
export default class Composer extends Component {
	state = {
		simple: false,
		show: false,
		mode: HTML_MODE,
		fromAccountId: null,
		expandPreviousMails: false,
		originalBody: '',
		modifiedBodyContent: '',
		prevMailSetting: PREVIOUS_MAIL_SHOW_ORIGINAL,
		previousMailModified: false,
		showPreviousMailControls: true,
		emailMismatchwithCert: false,
		...CLEAN
	};

	enhancedLinksData = {};

	/** Set up the editor based on incoming props
	 *	@param {Message} props.message
	 */
	applyIncomingMessage({ message }, isUpdatedDraftMessage = false) {
		if (!message) {
			throw new Error('Message not passed');
		}

		// Add attachments for all modes except reply
		const attachments =
			!message.id && message.replyType === 'r' ? CLEAN.attachments : message.attachments;

		// New attachments are any attachments without a messageId
		const [existingAttachments, newAttachments] = partition(
			attachments,
			({ messageId, base64, attachmentId }) => messageId || base64 || attachmentId
		);

		['to', 'cc', 'bcc'].forEach(field => {
			if (message[field] && typeof message[field] === 'string') {
				message[field] = message[field].split(/\s*,\s*/).map(toValue => parseAddress(toValue));
			}

			// preserve the SMIME certificate data if its present in the state, as the first draft save was clearing it out
			if (message[field]) {
				const propsField = get(message, field, []);
				const stateField = get(this.state, field, []);

				message[field] = propsField.map(
					pF => stateField.find(sF => sF.publicCert && sF.address === pF.address) || pF
				);
			}
		});

		this.setState({
			bcc: array(message.bcc),
			cc: array(message.cc),
			showCc: this.state.showCc || (array(message.cc).length || array(message.bcc).length) > 0,
			draftId: message.draftId,
			inReplyTo: message.inReplyTo,
			origId: message.origId,
			replyType: message.replyType,
			subject: message.subject,
			to: array(message.to),
			flags: addFlag(message.flags, MessageFlags.draft),
			attachments: existingAttachments || [],
			inlineAttachments: get(message, 'inlineAttachments.length')
				? message.inlineAttachments
				: CLEAN.inlineAttachments // Always include inline attachments
		});

		// Add new attachments that have never been attached before.
		if (newAttachments.length) {
			this.addAttachments(newAttachments);
		}

		if (!isUpdatedDraftMessage) {
			//If flag == 'sd' hide controls. Show message body in compose.
			if (hasFlag(message, 's') && hasFlag(message, 'd')) {
				const html = message.html && getEmailHTMLDocument(message);
				const bodyObj = new DOMParser().parseFromString(html, 'text/html');
				//Strip signature container if it exists.
				const signatures = bodyObj.querySelectorAll('[data-safe-id*="signature-card-"]');

				if (signatures.length) {
					signatures[0].parentNode.removeChild(signatures[0]);
				}

				let bodyText = bodyObj.body ? bodyObj.body.innerHTML : '';

				bodyText = fixImageUrl(bodyText, message.inlineAttachments);

				this.setState({
					showPreviousMailControls: false,
					expandPreviousMails: true,
					body: bodyText
				});
			} else {
				const html = message.html && getEmailHTMLDocument(cloneDeep(message));
				let body = html || message.text || '';

				body = fixImageUrl(body, message.inlineAttachments);

				const bodyObj = new DOMParser().parseFromString(body, 'text/html');

				const previousMailContainer =
					bodyObj.querySelector('#previousMailContainer') ||
					bodyObj.querySelector('[data-safe-id="previousMailContainer"]');

				if (previousMailContainer) {
					previousMailContainer.parentNode.removeChild(previousMailContainer);

					const userText = bodyObj.body ? bodyObj.body.innerHTML : '';

					this.setState({
						body: this.state.mode === TEXT_MODE ? htmlToText(userText) : userText
					});

					this.modifyBody(this.state.prevMailSetting);
				} else if (!message.draftId) {
					this.setState({
						originalBody: body
					});
				}
			}
		}

		if (!message.draftId) {
			this.setState({
				originalMessage: message,
				originalRecipients: getRecipients(message, ['to', 'cc', 'bcc', 'from'])
			});
		}
	}

	getDocument = () => this.editor && this.editor.getDocument();

	getFromAccount() {
		return find(this.props.accounts, ['id', this.state.fromAccountId]);
	}

	setDefaultFromAccountId = props => {
		if (this.state.fromAccountId) {
			return;
		}

		if (props.activeAccountId) {
			this.setState({ fromAccountId: props.activeAccountId });
			return;
		}

		const accounts = props.accounts;
		if (props.accounts && accounts.length > 0) {
			const id = get(getPrimaryAccount(accounts) || accounts[0], 'id');
			this.setState({ fromAccountId: id });
		}
	};

	editorRef = c => {
		// This ref function is used on two different components.
		// When one unmounts, it will invoke `this.editorRef(null)`.
		// Do not save the null references.
		if (!c) {
			return;
		}
		this.editor = (c.getWrappedInstance && c.getWrappedInstance()) || c;
	};

	getMessageToSend = () => {
		const { mode, originalMessage, confirmSend, fromAccountId, ...message } = this.state;
		let { body } = message;
		const from = this.getFromAccount();

		delete message.originalRecipients;
		delete message.simple;
		delete message.show;
		delete message.showCc;
		delete message.showAttachmentForwardConfirm;
		delete message.body;
		delete message.sender;

		if (from) {
			message.from = [
				{
					address: from.emailAddress,
					name: from.fromDisplay || from.emailAddress.split('@')[0]
				}
			];
		} else {
			const splitRegEx = new RegExp(`(.*)\\@(.*)\\((${SEND_ON_BEHALF}|${SEND_AS})\\)`, 'g');
			const [username, domain, delegationType] = fromAccountId.split(splitRegEx).filter(Boolean);
			const delegationEmail = username + '@' + domain;

			message.from = [
				{
					address: delegationEmail,
					name: username
				}
			];

			if (delegationType === SEND_ON_BEHALF) {
				const { accounts } = this.props;
				const sender = getPrimaryAccount(accounts) || accounts[0];
				message.sender = [
					{
						address: sender.emailAddress,
						name: sender.fromDisplay || sender.emailAddress.split('@')[0]
					}
				];
			}
		}
		// Convert partial text addresses into address objects:
		['to', 'cc', 'bcc'].forEach(field => {
			message[field] = message[field].map(recipient =>
				typeof recipient === 'string' ? { address: recipient } : recipient
			);
		});

		// text-only mode
		if (mode === TEXT_MODE) {
			message.text = body;
		} else {
			// replace inlined attachments with cid refs
			// @TODO use DOMParser instead of this.
			// body = body.replace(
			// 	/<img data-cid="(.*?)"\s*src=".*?"\s*(.*?)\s*\/?>/gi,
			// 	(s, cid, attrs) => `<img src="cid:${cid}" ${attrs} />`
			// );

			let currentDocBody = null;

			//When expandedPreviousMail send body in message else send modifiedBodyContent.
			if (message.replyType) {
				if (this.state.expandPreviousMails) {
					currentDocBody = new DOMParser().parseFromString(this.state.body, 'text/html').body;
				} else {
					this.modifyBody(this.state.prevMailSetting);
					currentDocBody = new DOMParser().parseFromString(
						this.state.modifiedBodyContent,
						'text/html'
					).body;
				}
			} else {
				const dom = this.getDocument();
				currentDocBody = dom.body.cloneNode(true);
				const doc = new DOMParser().parseFromString(
					'<!DOCTYPE html><html><body></body></html>',
					'text/html'
				);
				let child;
				while ((child = currentDocBody.firstChild)) doc.body.appendChild(child);
				currentDocBody = doc.body;
			}

			const walk = node => {
				// inline attachment CID references:
				// should not update the `src` attribute if SMIME is enabled and either sign or encrypt is selected
				// becuase in that case we just store the base64 value of the attachment as the src value
				if (node.nodeName === 'IMG' && node.hasAttribute('data-cid')) {
					node.hasAttribute('emoji')
						? emojiImageToUnicode(node)
						: node.setAttribute('src', `cid:${node.getAttribute('data-cid')}`);
				}

				// remove nodes that shouldn't be in the resulting message HTML:
				for (let i = STRIP_NODES.length; i--; ) {
					if (node.hasAttribute(STRIP_NODES[i])) {
						removeNode(node);
						return;
					}
				}

				// remove attributes that shouldn't be in the resulting message HTML:
				for (let i = STRIP_ATTRS.length; i--; ) {
					if (node.hasAttribute(STRIP_ATTRS[i])) {
						node.removeAttribute(STRIP_ATTRS[i]);
					}
				}

				let c = node.lastChild;
				while (c) {
					const prev = c.previousSibling;
					if (c.nodeType === 1) {
						walk(c);
					}
					c = prev;
				}
			};
			walk(currentDocBody);
			body = currentDocBody.innerHTML;

			message.html = body;
			message.text = htmlToText(body);
		}

		return message;
	};
	onSend = () => {
		const allRecipients = getRecipients(this.state, ['to', 'cc', 'bcc']);
		if (!allRecipients.length) {
			this.props.notify({
				message: <Text id="mail.notifications.noRecipient" />,
				failure: true
			});
			return;
		}

		const message = this.getMessageToSend();

		if (this.props.smimeOperation === SMIME_OPERATIONS.signAndEnc) {
			const { to, cc, bcc } = message;

			const emailMismatchRecipient = [...to, ...cc, ...bcc].find(recipient => {
				const { address, publicCertObject } = recipient;
				return publicCertObject && address !== get(publicCertObject, 'subject.email');
			});

			if (emailMismatchRecipient) {
				this.setState({ emailMismatchwithCert: true });
				return;
			}
		}

		//#prevMailContainer is useful only for parsing pervious mail text hence before sending the mail it should be stripped.
		const bodyObj = new DOMParser().parseFromString(message.html, 'text/html');
		const previousMailContainer =
			bodyObj.querySelector('#previousMailContainer') ||
			bodyObj.querySelector('[data-safe-id="previousMailContainer"]');

		if (previousMailContainer) {
			const previousMailBody = previousMailContainer.innerHTML;
			previousMailContainer.parentNode.removeChild(previousMailContainer);

			const userText = bodyObj.body ? bodyObj.body.innerHTML : '';

			message.html = userText + previousMailBody;
		}

		this.props.onSend(message);
	};

	clearPlaceholder = () => {
		const doc = this.getDocument();
		// Manually clear the placeholder
		if (doc.body.textContent === this.props.textareaPlaceholder) {
			doc.body.innerHTML = '';
		}
	};

	setBodyFromDocument = () => {
		const doc = this.getDocument();
		const uneditables = doc.querySelectorAll('[uneditable]');
		for (const node of uneditables) {
			node.setAttribute('contenteditable', 'false');
		}
		const body = doc.body.innerHTML;
		this._bodyFromDocument = body;
		this.setState({ body }, this.notifyChange);
	};

	insertAtCaret = (html, whitespacePadded) => {
		if (this.state.mode === TEXT_MODE) {
			return;
		}

		if (
			whitespacePadded &&
			this.editor &&
			this.editor.getEditorBase &&
			getCharacterPrecedingCaret(this.editor.getEditorBase()).trim()
		) {
			// Insert an extra whitespace if there isn't one already
			html = '&nbsp;' + html;
		}

		this.clearPlaceholder();
		insertAtCaret(window, html, this.getDocument());
	};

	embedLinks = links => {
		if (!links || !links.length) {
			return;
		}
		const sep = '<p style="margin:0;"><br/></p>',
			html = sep + links.map(LinkCard).join(sep) + sep;

		this.insertAtCaret(html);
		this.setBodyFromDocument();
	};

	addEmoji = ({ emoji, onDelete }) => {
		const contentId = generateNextCID();
		const html = EmojiImg({
			contentId,
			...emoji
		});

		this.insertAtCaret(html);
		this.setBodyFromDocument();

		//add a mutation observer that will call the onDelete function if the emoji is later deleted
		if (onDelete) {
			const emojiNode = this.base.querySelector(`img[data-cid="${contentId}"][emoji]`);
			addNodeDeleteHandler(emojiNode, onDelete);
		}
	};
	addBitmoji = bitmoji => {
		const contentId = generateNextCID();
		const html = BitmojiImg({
			contentId,
			url: bitmoji,
			name: 'bitmoji'
		});
		this.insertAtCaret(html);
		this.setBodyFromDocument();
	};
	embedImages = images => {
		if (typeof images !== 'undefined' && images.length) {
			// add contentIds to all images
			images = images.map(image => {
				image.contentId = generateNextCID();
				image.contentDisposition = 'inline';
				return image;
			});

			this.addAttachments(images);
		}
	};

	addLink = ({ html, url, uid, text }) => {
		this.insertAtCaret(html, true);
		this.enhanceLink({ url, uid, text });
	};

	enhanceLink = ({ url, uid, text }) => {
		// Save the body with link inserted

		this.props
			.linkEnhancer(url.trim())
			.then(enhancedLink => {
				// Return if there is insufficient data to create a link card.
				if (!enhancedLink.title && !enhancedLink.description) {
					return;
				}

				enhancedLink.url = url;
				enhancedLink.uid = uid;
				this.enhancedLinksData[url] = enhancedLink;
				if (!this.updateLinkText(enhancedLink, text)) {
					return;
				}
				this.moveCaretAfterElementParent(`enhanced-link-${uid}`);
				// the body in the state is stale at this point, get the latest html from the dom instead
				const html =
					`<p data-safe-id="enhanced-link-separator-top-${uid}" style="margin:0;"></p>` +
					EnhancedLinkCard(enhancedLink, {
						cardSize: CARD_SIZE.MEDIUM,
						cardLocation: CARD_LOCATION.BODY
					}) +
					`<p data-safe-id="enhanced-link-separator-${uid}" style="margin:0;"><br/></p>`;
				this.insertAtCaret(html);
				// Insert Html resets the background to initial
				this.repaintCard(uid);
				this.setBodyFromDocument();
				this.moveCaretAfterElement(`enhanced-link-separator-${uid}`);
			})
			.catch(err => {
				console.warn(err);
				this.props.showNotificationModal({
					message: err
				});
			});
	};

	repaintCard(uid) {
		const dom = this.getDocument();
		const linkCard = findElementByIdInEmail(dom, `enhanced-link-card-table-${uid}`);
		if (linkCard) {
			linkCard.style.background = '#fff';
		}
	}

	moveCaretAfterElement(elementId) {
		const dom = this.getDocument();
		const element = findElementByIdInEmail(dom, elementId);
		placeCaretAfterElement(window, element);
	}

	moveCaretAfterElementParent(elementId) {
		const dom = this.getDocument();
		const element = findElementParent(dom, elementId, ['a', 'p']);
		placeCaretAfterElement(window, element);
	}

	updateLinkText(link, originalText) {
		const dom = this.getDocument();
		const linkTag = findElementByIdInEmail(dom, `enhanced-link-${link.uid}`);
		if (linkTag) {
			if (!originalText) {
				linkTag.setAttribute('data-original-text', linkTag.innerText);
				linkTag.innerText = link.title;
			}
			return true;
		}
	}

	restoreLinkText(linkId) {
		const dom = this.getDocument();
		const linkTag = findElementByIdInEmail(dom, `enhanced-link-${linkId}`);
		if (linkTag) {
			const originalLinkText = linkTag.getAttribute('data-original-text');
			if (originalLinkText) linkTag.innerText = originalLinkText;
		}
	}

	chooseAttachments = () => {
		chooseFiles(this.addAttachments);
	};

	readFile = file => {
		const { name, filename, type, size, contentDisposition, contentId, contentType } = file;

		return readFile(file, { readerFn: 'readAsDataURL' })
			.then(result => {
				const [, base64] = result.match(/^.+;base64,(.*)$/);
				return {
					name: name || filename,
					type,
					size,
					base64,
					url: result,
					contentDisposition,
					contentId,
					contentType
				};
			})
			.catch(e => {
				console.error(e);
				this.props.showNotificationModal({
					message: e
				});
			});
	};

	downloadFile = file => {
		const { contentDisposition, contentId, contentType, filename, size, url } = file;

		return downloadFile(url)
			.then(text => {
				if (!text) {
					throw Error(`Error downloading the file ${filename}. Content is ${text}`);
				}
				const flatText = text.replace(/\r\n/g, '');
				return {
					name: filename,
					type: contentType,
					size,
					base64: flatText,
					url: `data:${contentType};base64,${flatText}`,
					contentDisposition,
					contentId,
					contentType
				};
			})
			.catch(e => {
				console.error(e);
				this.props.showNotificationModal({
					message: e
				});
			});
	};

	// If an attachment is already in progress, attachments are queued and
	// then processed after the other attachments are finished.
	addAttachments = (files = []) => {
		const { smimeOperation, isOffline } = this.props;

		if (isOffline) return;

		if (this.props.isSMIMEFeatureAvailable) {
			if (smimeOperation !== SMIME_OPERATIONS.noSignOrEnc) {
				const { attachments = [], inlineAttachments = [] } = this.state,
					promises = [];

				files.forEach(file => {
					const { url, messageId } = file;

					// if url and messageId present, then this file is selected from media menu
					if (url && messageId) {
						promises.push(this.downloadFile(file));
					} else {
						promises.push(this.readFile(file));
					}
				});
				Promise.all(promises).then((values = []) => {
					const [_inlineAttachments = [], _attachments = []] = partition(
							values,
							({ contentDisposition }) => contentDisposition === CONTENT_DISPOSITION_INLINE
						),
						sep = '<br />';

					_inlineAttachments.forEach(iAttach => this.insertAtCaret(sep + Img(iAttach) + sep));

					this.setState(
						{
							attachments: attachments.concat(_attachments),
							inlineAttachments: inlineAttachments.concat(_inlineAttachments)
						},
						this.notifyChange
					);
				});
				return;
			}
		}

		if (this.state.attachmentInProgress) {
			this.attachmentUploadQueue = (this.attachmentUploadQueue || []).concat(files);
			return;
		}

		this.setState({ attachmentInProgress: true });

		files = files.concat(this.attachmentUploadQueue || []);
		this.attachmentUploadQueue = [];

		const { uploadingFileList } = this.state;
		this.setState({
			uploadingFileList: uploadingFileList.concat(
				filter(files, f => f.contentDisposition !== CONTENT_DISPOSITION_INLINE)
			)
		});

		return this.props
			.attach(files, this.getMessageToSend())
			.then(message => {
				let { attachments, inlineAttachments, ...rest } = message;
				attachments = attachments || [];
				inlineAttachments = inlineAttachments || [];

				['to', 'cc', 'bcc'].forEach(field => {
					// preserve the SMIME certificate data if its present in the state, as the first draft save was clearing it out
					if (rest[field]) {
						const propsField = get(message, field, []);
						const stateField = get(this.state, field, []);

						rest[field] = propsField.map(
							pF => stateField.find(sF => sF.publicCert && sF.address === pF.address) || pF
						);
					}
				});

				this.setState({ attachments, inlineAttachments, ...rest }, this.notifyChange);
			})
			.catch(err => {
				// TODO: Change this to toasts
				console.error('Attach Error:', err);
				this.props.notify({
					message:
						(this.state.error ? this.state.error + '\n' : '') + String((err && err.message) || err),
					failure: true
				});
			})
			.then(() => {
				this.setState({ attachmentInProgress: false });

				// If there are attachments in the queue, call `addAttachments` again to process them.
				if (this.attachmentUploadQueue.length) {
					this.addAttachments();
				}
			});
	};

	removeAttachment = ({ attachment }) => {
		let { attachments, inlineAttachments, body } = this.state;

		// inline attachments have a contentId
		if (attachment && attachment.contentId) {
			body = body.replace(
				new RegExp(`(?:<br[^>]*>\\s*)?<img[^>]*data-cid="${attachment.contentId}"[^>]*>`, 'gi'),
				''
			);

			this.setState(
				{
					body,
					inlineAttachments: inlineAttachments.filter(a => a !== attachment)
				},
				this.notifyChange
			);
		} else {
			this.setState(
				{
					attachments: attachments.filter(a => a !== attachment)
				},
				this.notifyChange
			);
		}
	};

	closeAttachmentForwardConfirm = () => {
		this.setState(
			{
				showAttachmentForwardConfirm: false,
				confirmSend: true
			},
			this.onSend
		);
	};

	handleAttachmentForwardConfirm = confirmed => {
		if (confirmed) {
			const { originalMessage } = this.state;
			this.addAttachments(originalMessage.attachments).then(this.closeAttachmentForwardConfirm);
		} else {
			this.closeAttachmentForwardConfirm();
		}
	};

	close = () => {
		this.props.onCancel && this.props.onCancel();
	};

	toggleCc = () => {
		this.setState({ showCc: !this.state.showCc });
	};

	unsimple = () => {
		this.setState({ simple: false });
	};

	toggleTextMode = () => {
		let { mode, body } = this.state;
		mode = mode === TEXT_MODE ? HTML_MODE : TEXT_MODE;

		if (mode === TEXT_MODE) {
			if (this.state.expandPreviousMails) {
				body = htmlToText(body);
			} else {
				this.modifyBody(this.state.prevMailSetting);
				body = htmlToText(this.state.modifiedBodyContent);
			}
		} else {
			body = getEmailHTMLDocument({ text: body });
		}

		this.setState({
			mode,
			body,
			showPreviousMailControls: false
		});
	};

	toggleMediaMenu = () => {
		if (this.props.toggleMediaMenu) {
			this.props.toggleMediaMenu();
		}
	};

	openTab = tabIndex => {
		if (this.props.selectTab) {
			this.props.selectTab(tabIndex);
		}
		if (!this.props.showMediaMenu) {
			this.toggleMediaMenu();
		}
	};

	removeEmbeddedLink(t) {
		const dataCardId = t.getAttribute('data-card-id');
		this.restoreLinkText(dataCardId);
		do {
			if (t.hasAttribute('embedded-card')) {
				removeNode(t);
				this.removeCardSeparators(dataCardId);
				this.checkFooterLinks();
				this.setBodyFromDocument();
				return;
			}
		} while ((t = t.parentNode) && t !== this.base);
	}

	removeCardSeparators(linkId) {
		const dom = this.getDocument();
		const topSeparator = findElementByIdInEmail(dom, `enhanced-link-separator-top-${linkId}`);
		removeNode(topSeparator);
		const bottomSeparator = findElementByIdInEmail(dom, `enhanced-link-separator-${linkId}`);
		removeNode(bottomSeparator);
	}

	removeEmbeddedImage(t) {
		do {
			if (t.hasAttribute('embedded-image')) {
				removeNode(t);
				const contentId = t.getElementsByTagName('img')[0].getAttribute('data-cid');

				this.removeAttachment({
					attachment: find(
						this.state.inlineAttachments,
						attachment => attachment.contentId === contentId
					)
				});

				this.setBodyFromDocument();
				return;
			}
		} while ((t = t.parentNode) && t !== this.base);
	}

	toggleShrinkEmbeddedImage(t) {
		do {
			if (t.hasAttribute('embedded-image')) {
				const imageNode = t.getElementsByTagName('img')[0];
				if (t.hasAttribute('collapsed')) {
					t.removeAttribute('collapsed');
					imageNode.removeAttribute('style');
				} else {
					t.setAttribute('collapsed', '');
					imageNode.setAttribute('style', 'width: 100%; max-width: 320px;');
				}
				this.setBodyFromDocument();
				return;
			}
		} while ((t = t.parentNode) && t !== this.base);
	}

	handleBodyClick = e => {
		e.preventDefault();
		e.stopPropagation();
		const t = e.target;

		if (t.hasAttribute('button-card-size-small')) {
			this.resizeEnhancedCard(t, CARD_SIZE.SMALL);
		}

		if (t.hasAttribute('button-card-size-medium')) {
			this.resizeEnhancedCard(t, CARD_SIZE.MEDIUM);
		}

		if (t.hasAttribute('button-card-size-large')) {
			this.resizeEnhancedCard(t, CARD_SIZE.LARGE);
		}

		if (t.hasAttribute('button-move-card-to-footer')) {
			this.moveEnhancedCardToFooter(t);
		}

		if (t.hasAttribute('button-move-inline')) {
			this.restoreFooterCard(t);
		}

		if (t.hasAttribute('button-remove-card')) {
			this.removeEmbeddedLink(t);
		}

		if (t.hasAttribute('button-remove-image')) {
			this.removeEmbeddedImage(t);
		}
		if (t.hasAttribute('button-toggle-shrink-image')) {
			this.toggleShrinkEmbeddedImage(t);
		}
	};

	resizeEnhancedCard(button, newSize) {
		const dom = this.getDocument();
		const cardId = button.getAttribute('data-card-id');
		const currentCard = findElementByIdInEmail(dom, `enhanced-link-card-${cardId}`);
		const dataUrl = currentCard.getAttribute('data-url');

		const replacementCard = EnhancedLinkCard(this.enhancedLinksData[dataUrl], {
			cardSize: newSize
		});
		currentCard.outerHTML = replacementCard;

		this.setState({ body: dom.body.innerHTML });
	}

	restoreFooterCard(button) {
		const dom = this.getDocument();
		const cardId = button.getAttribute('data-card-id');
		const currentCard = findElementByIdInEmail(dom, `enhanced-link-card-${cardId}`);
		const dataUrl = currentCard.getAttribute('data-url');
		const restoreToSize = currentCard.getAttribute('data-restore-card-size');
		const replacementCard = EnhancedLinkCard(this.enhancedLinksData[dataUrl], {
			cardSize: restoreToSize,
			cardLocation: CARD_LOCATION.BODY
		});

		const originalPlaceholder = findElementByIdInEmail(
			dom,
			`enhanced-link-card-placeholder-${cardId}`
		);
		originalPlaceholder.outerHTML = replacementCard;

		removeNode(currentCard);

		this.checkFooterLinks(dom);

		this.setState({ body: dom.body.innerHTML });
	}

	checkFooterLinks(dom) {
		if (!dom) dom = this.getDocument();
		const linksFooter = findElementByIdInEmail(dom, 'footerLinks');

		if (linksFooter && !linksFooter.children.length) {
			const footerLinksWrapper = findElementByIdInEmail(dom, 'footerLinksWrapper');
			removeNode(footerLinksWrapper);
		}
	}

	moveEnhancedCardToFooter(button) {
		const dom = this.getDocument();
		const cardId = button.getAttribute('data-card-id');
		const currentCard = findElementByIdInEmail(dom, `enhanced-link-card-${cardId}`);
		const dataUrl = currentCard.getAttribute('data-url');
		const currentCardSize = currentCard.getAttribute('data-current-card-size');

		const replacementCard = EnhancedLinkCard(this.enhancedLinksData[dataUrl], {
			cardSize: CARD_SIZE.SMALL,
			cardLocation: CARD_LOCATION.FOOTER,
			restoreToSize: currentCardSize
		});

		currentCard.innerHTML = '';
		currentCard.setAttribute('id', `enhanced-link-card-placeholder-${cardId}`);
		currentCard.setAttribute('enhanced-link-card-placeholder', '');

		const linksFooter = findElementByIdInEmail(dom, 'footerLinks');

		if (linksFooter) {
			linksFooter.innerHTML += replacementCard;
			this.setState({ body: dom.body.innerHTML });
		} else {
			let body = dom.body.innerHTML;
			body += '<br/>' + FooterLinks(replacementCard);
			this.setState({ body });
		}
	}

	handleTextAreaFocusIn = () => {
		if (!this.props.isRecentlyActive) {
			this.setActiveEditor();
		}
	};

	setActiveEditor = () =>
		this.props.setActiveEditor && this.props.setActiveEditor(this.props.a11yId);
	unsetActiveEditor = () =>
		this.props.unsetActiveEditor && this.props.unsetActiveEditor(this.props.a11yId);

	consumeMediaBuffer = ({ mediaBuffer, clearMediaBuffer }) => {
		// Only allow a Composer component to consume the media buffer if it
		// contains the most recently focused text editor.
		if (!this.props.isRecentlyActive) {
			return;
		}

		const { action, data, contentType } = mediaBuffer;
		if (action === 'attach') {
			this.addAttachments(data);
		} else if (action === 'embed') {
			if (contentType === 'text/uri-list') {
				this.embedLinks(data);
			} else {
				this.embedImages(data);
			}
		}
		clearMediaBuffer && clearMediaBuffer();
	};

	/**
	 * Avoid attaching multiple signatures when email/conv is already in drafts and user opened it.
	 * Ideally, we should use some markers to detect if Signature is already attached in email body.
	 * But, sanitize method and serialization are removing these attributes.
	 * TO DO: We need to find a solution to bipass and save signature along with marker attributes
	 *        so that we can use it to detect presence of signature.
	 */
	isInFolder = folderName => {
		const { srcFolder } = this.props;

		if (!srcFolder || !folderName) {
			return false;
		}

		return (
			+srcFolder.id === USER_FOLDER_IDS[folderName.toUpperCase()] ||
			String(srcFolder.name).toLowerCase() === folderName.toLowerCase()
		);
	};

	attachSignature = fromSignatureAccountId => {
		if (!this.isInFolder(DRAFTS) && !this.isInFolder(OUTBOX)) {
			const { message, accounts, replyLocalFolder } = this.props;
			let signatureContent = '';
			let bodyString = this.state.body;
			const bodyParsed = new DOMParser().parseFromString(bodyString, 'text/html');
			const messageType = get(message, 'rt', get(message, 'replyType'));
			const signatures = bodyParsed.querySelectorAll('[data-safe-id*="signature-card-"]');
			let signatureValue = '';

			accounts.length &&
				accounts.map(account => {
					if (account.id === fromSignatureAccountId) {
						const { forwardReplySignatureValue, defaultSignatureValue } = account;
						signatureValue = messageType ? forwardReplySignatureValue : defaultSignatureValue;
						signatureContent = signatureValue ? SignatureCard(signatureValue) : '';
					}
				});

			if (signatures.length) {
				signatures[signatures.length - 1].outerHTML = signatureContent;
				bodyString = bodyParsed.getElementsByTagName('body')[0].innerHTML;
			} else if (messageType) {
				//Remove the signature container if it already exists to avoid duplicating it.
				if (this.state.expandPreviousMails) {
					const previousMailContainer =
						bodyParsed.querySelector('#previousMailContainer') ||
						bodyParsed.querySelector('[data-safe-id="previousMailContainer"]');
					let previousMails = '';

					if (previousMailContainer) {
						previousMails = previousMailContainer.innerHTML;
						previousMailContainer.parentNode.removeChild(previousMailContainer);
					}

					const userText = bodyParsed.body ? bodyParsed.body.innerHTML : '';

					if (!this.state.flags.includes('s') && !this.state.flags.includes('d')) {
						bodyString = `${userText} <br> ${signatureContent} <div id='previousMailContainer'>${previousMails}</div>`;
					}
				} else {
					bodyString = `${bodyString} ${signatureContent}`;
				}
			} else if (!messageType && !replyLocalFolder) {
				bodyString = `${bodyString} <br><br> ${signatureContent}`;
			}

			this.setState({
				body: bodyString
			});
		}
	};

	notifyChange = () => {
		if (!this.props.onChange) {
			return;
		}
		// To let component complete its rendering cycle first and than execute event which is triggered in between of render cycle.
		setTimeout(() => {
			const message = this.getMessageToSend();
			this.props.onChange(message);
		}, 0);
	};

	handleInput = e => {
		const body = this.state.mode === TEXT_MODE ? e.target.value : e.value;
		this.setState({ body });
		this.notifyChange();
	};

	handleChangeTo = e => {
		const { to } = this.state;

		this.setState({ to: e.value });
		if (withoutStrings(to).length !== withoutStrings(e.value).length) {
			this.notifyChange();
		}
	};

	handleChangeCc = e => {
		const { cc } = this.state;

		this.setState({ cc: e.value });
		if (withoutStrings(cc).length !== withoutStrings(e.value).length) {
			this.notifyChange();
		}
	};

	handleChangeBcc = e => {
		const { bcc } = this.state;

		this.setState({ bcc: e.value });
		if (withoutStrings(bcc).length !== withoutStrings(e.value).length) {
			this.notifyChange();
		}
	};

	handleChangeSubject = e => {
		this.setState({ subject: e.target.value }, this.notifyChange);
	};

	handleChangeFrom = ({ value }) => {
		this.setState({ fromAccountId: value }, this.notifyChange);
		this.attachSignature(value);
	};

	setDisplayValueForSelect = () => {
		const { fromOptions } = this.props;
		const currentPosition = fromOptions.find(option => option.value === this.state.fromAccountId);
		let label;
		if (currentPosition) {
			label = currentPosition.label;
		} else {
			// if at runtime user deletes an secondary account from settings and composer is open with respective account selected in from list then it will set from field to primary account
			const { primaryAccountLabel, primaryAccountValue } = fromOptions[0];
			label = primaryAccountLabel;
			this.setState({ fromAccountId: primaryAccountValue }, this.notifyChange);
		}
		return label;
	};

	addEditorSpace = () => {
		this.setState({
			body: `<br><br> ${this.state.body}`
		});
	};

	//Set focus on text editor.
	setEditorFocus = () => {
		this.setState({ show: true }, () => {
			if (this.props.autofocus) {
				setTimeout(() => {
					if (!this.base) {
						// The component may have already unmounted
						return;
					}

					this.base.scrollIntoView();

					if (this.props.autofocusTarget === 'body') {
						this.editor.focus();
					} else {
						const m = this.base.querySelector('input,textarea,iframe');
						if (m) m.focus();
					}

					this.base.scrollIntoView();
				}, 50);
			}
		});
	};

	handleTogglePreviousMail = () => {
		this.setState({
			expandPreviousMails: true
		});

		this.modifyBody(this.state.prevMailSetting);

		this.setEditorFocus();
	};

	handleSelectPreviousMessageSetting = option => {
		//If content in #previousMailContainer has changed then throw modal. (If checkPreviousMailChanged is true)
		if (this.checkPreviousMailChanged()) {
			//Set previousMailModified in state to true if user confirms. If user hits cancel do nothing.
			this.setState({
				previousMailModified: true,
				previousMessageSetting: option
			});
		} else {
			//Else call assembleMailContent
			this.assembleMailContent(option);
		}

		this.setEditorFocus();
	};

	onConfirmModifyPreviousMail = () => {
		this.assembleMailContent(this.state.previousMessageSetting);

		this.setState({
			previousMailModified: false
		});

		this.setEditorFocus();
	};

	onDenyModifyPreviousMail = () => {
		this.setState({
			previousMailModified: false
		});

		this.setEditorFocus();
	};

	//Check if previous mail content has been modified by user.
	checkPreviousMailChanged = () => {
		if (this.state.expandPreviousMails) {
			//Check whether innerHTML of #previousMailContainer in body and modifiedBody are the same. If not return true else false.
			const bodyObj = new DOMParser().parseFromString(this.state.body, 'text/html');
			const bodyPreviousMail =
				bodyObj.querySelector('#previousMailContainer') ||
				bodyObj.querySelector('[data-safe-id="previousMailContainer"]');

			const modifiedBodyObj = new DOMParser().parseFromString(
				this.state.modifiedBodyContent,
				'text/html'
			);
			const modifiedBodyPreviousMail =
				modifiedBodyObj.querySelector('#previousMailContainer') ||
				modifiedBodyObj.querySelector('[data-safe-id="previousMailContainer"]');

			if (bodyPreviousMail.innerHTML === modifiedBodyPreviousMail.innerHTML) {
				return false;
			}

			return true;
		}

		return false;
	};

	//Prepare mail body based on the 'previous message control' setting.
	assembleMailContent = option => {
		// Strip previous mail here. Everything inside the #previousMailContainer.
		if (this.state.expandPreviousMails) {
			const bodyObj = new DOMParser().parseFromString(this.state.body, 'text/html');
			const previousMailContainer =
				bodyObj.querySelector('#previousMailContainer') ||
				bodyObj.querySelector('[data-safe-id="previousMailContainer"]');

			if (previousMailContainer) {
				previousMailContainer.parentNode.removeChild(previousMailContainer);
			}

			const body = bodyObj.body ? bodyObj.body.innerHTML : '';

			this.setState({
				body
			});
		}

		this.modifyBody(option);
	};

	//Modifies the body content based on the expand setting and the previous mail control setting.
	modifyBody = option => {
		if (option === PREVIOUS_MAIL_DONT_SHOW) {
			this.setState(state => ({
				modifiedBodyContent: `${state.body} <br><br> <div id="previousMailContainer"></div>`,
				body: `${state.body} <br><br> <div id="previousMailContainer"></div>`,
				prevMailSetting: option,
				expandPreviousMails: true
			}));
		} else if (option === PREVIOUS_MAIL_SHOW_ORIGINAL) {
			this.setState(state => ({
				modifiedBodyContent: `${state.body} <br><br> <div id="previousMailContainer"> ${
					state.originalBody
				} </div>`,
				body: state.expandPreviousMails
					? `${state.body} <br><br> <div id="previousMailContainer"> ${state.originalBody} </div>`
					: state.body,
				prevMailSetting: option
			}));
		} else if (option === PREVIOUS_MAIL_SHOW_LAST) {
			this.setState(state => {
				const bodyObj = new DOMParser().parseFromString(state.originalBody, 'text/html');
				const replyToRemove = bodyObj.querySelector('#OLK_SRC_BODY_SECTION span:first-of-type');

				if (replyToRemove) {
					replyToRemove.parentNode.removeChild(replyToRemove);
				}

				const body = bodyObj.body ? bodyObj.body.innerHTML : '';

				return {
					modifiedBodyContent: `${
						state.body
					} <br><br> <div id="previousMailContainer"> ${body} </div>`,
					body: state.expandPreviousMails
						? `${state.body} <br><br> <div id="previousMailContainer"> ${body} </div>`
						: state.body,
					prevMailSetting: option
				};
			});
		}
	};

	handleChangeSmimeOperation = operation => {
		const { smimeOperation: previouslySelectedSmimeOperation } = this.props;
		const { attachments = [], inlineAttachments = [] } = this.state;
		this.props.onChangeSmimeOperation(this.getMessageToSend(), operation);
		// drop attachments if required
		if (
			operation === SMIME_OPERATIONS.noSignOrEnc ||
			previouslySelectedSmimeOperation === SMIME_OPERATIONS.noSignOrEnc
		) {
			if (attachments.length > 0 || inlineAttachments.length > 0) {
				this.setState({
					attachmentsDropWarningText: true
				});

				return;
			}
		}
	};

	handleChangeInReadReceipt = operation => this.props.onChangeReadReceiptOperation(operation);

	handleAttachmentDrop = () => {
		const selectedSmimeOperation = this.props.smimeOperation;

		let { inlineAttachments = [], body } = this.state;

		inlineAttachments.forEach(attachment => {
			if (attachment && attachment.contentId) {
				body = body.replace(
					new RegExp(`(?:<br[^>]*>\\s*)?<img[^>]*data-cid="${attachment.contentId}"[^>]*>`, 'gi'),
					''
				);
			}
		});

		this.setState(
			{
				body,
				attachments: [],
				inlineAttachments: [],
				attachmentsDropWarningText: null
			},
			() => {
				this.props.onChangeSmimeOperation(this.getMessageToSend(), selectedSmimeOperation);
			}
		);
	};

	handleCloseCompose = () => {
		const { removeTab: removeComposeTab, closeCompose: closeComposer } = this.props;

		closeComposer();
		removeComposeTab({ type: MailFolderView.message, id: this.state.draftId });
		route('/');
	};

	handleEmailMismatchwithCert = () => {
		this.setState({ emailMismatchwithCert: false });
	};

	onCloseAttachmentDrop = () => {
		this.setState({
			attachmentsDropWarningText: null
		});
	};

	componentWillMount() {
		const { message, accounts, showMediaMenu } = this.props;
		const fromAddress = get(message, 'from.0.address');
		const acc = accounts.find(({ emailAddress }) => fromAddress === emailAddress);
		acc && this.setState({ fromAccountId: acc.id });

		showMediaMenu && this.toggleMediaMenu();
		this.setDefaultFromAccountId(this.props);
	}

	componentDidMount() {
		this.setActiveEditor();
		this.applyIncomingMessage(this.props);

		if (!this.props.message.draftId) {
			this.modifyBody(this.state.prevMailSetting);
		}

		this.attachSignature(this.props.activeAccountId);

		if (!this.isInFolder(DRAFTS) && !this.isInFolder(OUTBOX)) {
			this.addEditorSpace();
		}

		if (this.props.showMediaMenu) {
			this.mediaMenuLoaded = true;
		}

		// eslint-disable-next-line react/no-did-mount-set-state
		this.setEditorFocus();
	}

	componentWillReceiveProps(nextProps) {
		const newMessage = nextProps.message,
			oldMessage = this.props.message;
		if (getId(newMessage) !== getId(oldMessage) || nextProps.mode !== this.props.mode) {
			this.applyIncomingMessage(
				nextProps,
				!oldMessage.draftId || (oldMessage.draftId && isOfflineId(oldMessage.draftId))
			);
		}

		// Add attachments for all modes except reply
		if (!newMessage.id && newMessage.replyType !== 'r') {
			const [existingAttachments] = partition(
				newMessage.attachments,
				({ messageId, base64, attachmentId }) => messageId || base64 || attachmentId
			);
			this.setState({
				attachments: existingAttachments.length ? existingAttachments : this.state.attachments,
				inlineAttachments:
					newMessage.inlineAttachments && newMessage.inlineAttachments.length
						? newMessage.inlineAttachments
						: this.state.inlineAttachments
			});
		}

		const newMsgInlineAttachments = get(newMessage, 'inlineAttachments') || [];
		const oldMsgInlineAttachments = get(oldMessage, 'inlineAttachments') || [];

		const matchedInlineAttachments = newMsgInlineAttachments.filter(newAttachment => {
			if (newAttachment.part) {
				if (oldMsgInlineAttachments.length > 0) {
					const matchedAttachment = oldMsgInlineAttachments.find(
						oldAttchment => oldAttchment.filename === newAttachment.filename
					);
					if (matchedAttachment) {
						return !matchedAttachment.part;
					}
				}
				return true;
			}
			return false;
		});

		if (matchedInlineAttachments.length) {
			matchedInlineAttachments.forEach(inlineAttachment => {
				if (inlineAttachment.contentDisposition === CONTENT_DISPOSITION_INLINE) {
					const sep = '<br />';
					this.insertAtCaret(sep + Img(inlineAttachment) + sep);
				}
			});
			matchedInlineAttachments &&
				matchedInlineAttachments.forEach(attachment =>
					updateInlineAttachmentPartNumber(this.getDocument(), attachment)
				);

			this.setBodyFromDocument();

			this.setState({
				inlineAttachments:
					newMessage.inlineAttachments && newMessage.inlineAttachments.length
						? newMessage.inlineAttachments
						: this.state.inlineAttachments
			});
		}

		if (nextProps.mediaBuffer && nextProps.mediaBuffer.data) {
			this.consumeMediaBuffer(nextProps);
		}
		if (!this.props.showMediaMenu && nextProps.showMediaMenu) {
			this.mediaMenuLoaded = true;
			this.props.setPreviewAttachment();
		}
		if (this.props.showMediaMenu && nextProps.isOffline) {
			this.props.hideMediaMenu();
		}
		this.setDefaultFromAccountId(nextProps);
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (!shallowEqual(nextProps, this.props)) return true;
		// shallowEqual(), but special-casing body to see exempt self-inflicted changes to it.
		for (const i in nextState) {
			if (nextState[i] !== this.state[i]) {
				if (i === 'body' && nextState.body === this._bodyFromDocument) continue;
				return true;
			}
		}
		for (const i in this.state) if (!(i in nextState)) return true;
		return false;
	}

	componentWillUnmount() {
		this.unsetActiveEditor();

		if (this.props.showMediaMenu) {
			this.toggleMediaMenu();
		}
	}

	render(
		{
			message,
			textareaPlaceholder,
			showMediaMenu,
			onDelete,
			inline,
			matchesScreenMd,
			isSMIMEFeatureAvailable: smimeEnable,
			toLabel,
			ccLabel,
			bccLabel,
			loading,
			smimeOperation,
			requestReadReceipt,
			isOffline,
			fromOptions
		},
		{
			show,
			mode,
			simple,
			showCc,
			showAttachmentForwardConfirm,
			to,
			cc,
			bcc,
			subject,
			body,
			attachments,
			attachmentInProgress,
			uploadingFileList,
			attachmentsDropWarningText,
			previousMailModified,
			showPreviousMailControls,
			expandPreviousMails,
			prevMailSetting,
			emailMismatchwithCert
		}
	) {
		const enableFromSelect = fromOptions.length > 1;
		const allRecipients = getRecipients(this.state, ['to', 'cc', 'bcc']);
		const isSendInProgress = attachmentInProgress || loading;
		return (
			<div class={style.composer}>
				<div class={style.inner}>
					<div class={cx(style.left, showMediaMenu && style.mediaMenuOpen)}>
						{!inline && (
							<Icon
								class={cx(style.closeButton, style.hideSmDown)}
								name="close"
								size="sm"
								onClick={this.close}
							/>
						)}
						<div class={style.fields}>
							<div class={style.header}>
								<div class={style.item}>
									<div class={style.from}>
										<Text id="compose.from" />
										<div class={style.fromValueWrapper}>
											{enableFromSelect ? (
												<Select
													displayValue={this.setDisplayValueForSelect()}
													onChange={this.handleChangeFrom}
													class={style.selectFromValue}
													iconPosition="right"
													toggleButtonClass={style.selectFromtoggleButtonClass}
												>
													{fromOptions.map(option => (
														<Option
															icon={false}
															layered
															value={option.value}
															iconPosition="right"
															class={style.selectFromOption}
														>
															<div class={style.selectFromOptionItem}>{option.label}</div>
														</Option>
													))}
												</Select>
											) : (
												<div class={style.fromValue}>{get(fromOptions, '0.label')}</div>
											)}
										</div>
										{smimeEnable && (
											<SMIMEOperationDropDown
												smimeOperation={smimeOperation}
												changeSmimeOperation={this.handleChangeSmimeOperation}
											/>
										)}
										{matchesScreenMd && (
											<ReadReceiptsDropDown
												requestReadReceipt={requestReadReceipt}
												updateReadReceipt={this.handleChangeInReadReceipt}
											/>
										)}
									</div>
								</div>

								<div class={cx(style.item)}>
									<AddressField
										class={style.addressField}
										tokenInputClass={style.tokenInput}
										label={toLabel}
										value={to.address || to}
										onChange={this.handleChangeTo}
										onCertDataChange={linkstate(this, 'to', 'value')}
										showCertBadge
									/>
									<Button class={style.toggleCc} styleType="text" onClick={this.toggleCc}>
										{showCc ? <Text id="compose.hideCc" /> : <Text id="compose.showCc" />}
									</Button>
								</div>

								{showCc && (
									<div class={style.item}>
										<AddressField
											class={style.addressField}
											tokenInputClass={style.tokenInput}
											label={ccLabel}
											value={cc.address || cc}
											onChange={this.handleChangeCc}
											onCertDataChange={linkstate(this, 'cc', 'value')}
											showCertBadge
										/>
									</div>
								)}

								{showCc && (
									<div class={style.item}>
										<AddressField
											class={style.addressField}
											tokenInputClass={style.tokenInput}
											label={bccLabel}
											value={bcc.address || bcc}
											onChange={this.handleChangeBcc}
											onCertDataChange={linkstate(this, 'bcc', 'value')}
											showCertBadge
										/>
									</div>
								)}

								{!simple && (
									<div class={cx(style.item, style.itemInput, style.subjectInput)}>
										<Localizer>
											<input
												class={style.subject}
												placeholder={<Text id="compose.subject" />}
												value={subject}
												onInput={this.handleChangeSubject}
											/>
										</Localizer>
										<div class={cx(style.hideMdUp, style.actionMenuAttachments)}>
											<ActionMenuComposeAttachments
												onChooseAttachment={this.chooseAttachments}
												onOpenMediaMenu={this.openTab}
												iconOnly
												monotone
												arrow={false}
												actionButtonClass={style.actionMenuAttachmentsButton}
												popoverClass={style.actionMenuAttachmentsPopover}
												iconClass={style.actionMenuAttachmentsIcon}
												isOffline={isOffline}
											/>
										</div>
									</div>
								)}
							</div>

							<div class={style.body}>
								{mode === TEXT_MODE ? (
									<Textarea
										placeholder={textareaPlaceholder}
										value={body || ''}
										onInput={this.handleInput}
										ref={this.editorRef}
										attachments={attachments.filter(isAttachmentDisposition)}
										onChooseAttachment={this.chooseAttachments}
										onRemoveAttachment={this.removeAttachment}
										onToggleTextMode={this.toggleTextMode}
										onSend={this.onSend}
										onDelete={onDelete}
										isSendInProgress={isSendInProgress}
										uploadingFiles={uploadingFileList}
										messageLastSaved={message.date}
									/>
								) : (
									<RichTextArea
										class={style.editor}
										stylesheet={EDITOR_STYLESHEET}
										placeholder={textareaPlaceholder}
										value={
											show
												? body || '<p style="margin: 0;"><span><br></span></p>'
												: '&nbsp;<br><br>'
										}
										onClick={this.handleBodyClick}
										onFocusIn={this.handleTextAreaFocusIn}
										onInput={this.handleInput}
										attachments={attachments.filter(isAttachmentDisposition)}
										onAttachFiles={this.addAttachments}
										onChooseAttachment={this.chooseAttachments}
										onRemoveAttachment={this.removeAttachment}
										onEmbedFiles={this.embedImages}
										onEmbedLinks={this.embedLinks}
										onAddLink={this.addLink}
										onEmojiSelect={this.addEmoji}
										onBitmojiSelect={this.addBitmoji}
										onToggleMediaMenu={this.toggleMediaMenu}
										onToggleTextMode={this.toggleTextMode}
										onOpenTab={this.openTab}
										onSend={this.onSend}
										onDelete={onDelete}
										loading={isSendInProgress}
										disabled={!allRecipients.length}
										messageLastSaved={message.date}
										matchesScreenMd={matchesScreenMd}
										ref={this.editorRef}
										inline={inline}
										uploadingFiles={uploadingFileList}
										replyType={message.replyType}
										onTogglePreviousMail={this.handleTogglePreviousMail}
										onSelectPreviousMessageSetting={this.handleSelectPreviousMessageSetting}
										expandPrevMail={expandPreviousMails}
										previousMessageSetting={prevMailSetting}
										showPreviousMailControls={showPreviousMailControls}
										isOffline={isOffline}
									/>
								)}
							</div>

							{previousMailModified && (
								<ModalDialog
									title="dialogs.previousMailSetting.confirmModalTitle"
									actionLabel="buttons.ok"
									onAction={this.onConfirmModifyPreviousMail}
									onClose={this.onDenyModifyPreviousMail}
								>
									<Text id="dialogs.previousMailSetting.confirmModalText" />
								</ModalDialog>
							)}
						</div>
					</div>

					<div
						class={cx(style.right, showMediaMenu && style.mediaMenuOpen, inline && style.rightPane)}
					>
						{this.mediaMenuLoaded && <MediaMenu />}
					</div>
				</div>

				{showAttachmentForwardConfirm && (
					<ConfirmAttachmentForwardDialog onConfirm={this.handleAttachmentForwardConfirm} />
				)}
				{!inline && (
					<ComposerToolbar
						onSend={this.onSend}
						onClose={this.close}
						attachBitmoji={this.attachBitmoji}
						loading={isSendInProgress}
						disabled={!allRecipients.length}
						requestReadReceipt={requestReadReceipt}
						updateReadReceipt={this.handleChangeInReadReceipt}
					/>
				)}
				{attachmentsDropWarningText && (
					<SMIMEDialog
						dialogTitle="dialogs.attachmentWarning.title"
						actionText="dialogs.attachmentWarning.proceed"
						cancelText="dialogs.attachmentWarning.cancel"
						textId="dialogs.attachmentWarning.message"
						onClose={this.onCloseAttachmentDrop}
						onAction={this.handleAttachmentDrop}
					/>
				)}

				{(smimeOperation === SMIME_OPERATIONS.signAndEnc ||
					smimeOperation === SMIME_OPERATIONS.sign) &&
				isOffline ? (
					<SMIMEDialog
						dialogTitle="dialogs.SMIMEOffline.title"
						actionText="buttons.ok"
						textId="dialogs.SMIMEOffline.message"
						onAction={this.handleCloseCompose}
						onClose={this.handleCloseCompose}
						cancelButton={false}
					/>
				) : null}
				{emailMismatchwithCert && (
					<ModalDialog
						title="dialogs.emailMismatchWithCert.title"
						onAction={this.handleEmailMismatchwithCert}
						onClose={this.handleEmailMismatchwithCert}
						cancelButton={false}
					>
						<p>
							<Text id="dialogs.emailMismatchWithCert.message" />
						</p>
					</ModalDialog>
				)}
			</div>
		);
	}
}
