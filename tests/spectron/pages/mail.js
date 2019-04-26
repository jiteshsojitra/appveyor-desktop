const app = require('../framework/app-config');
const option = require('../framework/elements/option');
const textfield = require('../framework/elements/textfield');
const folderLabel = require('../framework/elements/folder');
const utils = require('../framework/utils');
const button = require('../framework/elements/button');
const soap = require('../framework/soap-client');

module.exports = {
	locators: {
		// Mail
		mailTab: 'span=Mail',
		newMessageButton: 'a=New Message',
		closeIcon: 'span.zimbra-client_composer_closeButton',
		smimeDropDown: 'button.zimbra-client_composer_smimeOperationBtn',
		messageBody: 'rich-text-area',
		messageBodyInlineImage: 'rich-text-area img',
		toRecipients: 'input.zimbra-client_address-field_inputField',
		subject: 'input.zimbra-client_composer_subject',
		sendButton: 'div.zimbra-client_composer_inner button[class$="_send"]',
		messageList: 'div.zimbra-client_mail-list_messageGroup',
		messageListHeader: 'div.zimbra-client_mail-list-header_mailListHeader',
		messageContent: 'div.zimbra-client_viewer',
		inlineImageInMessageBody: '//div[contains(@class,"zimbra-client_html-viewer_inner")]//img[@src]',
		blockquoteInlineImage: "//div[@class='zimbra-client_html-viewer_inner']//img[@src]/ancestor::blockquote",
		attachments: 'div.zimbra-client_attachment-grid_attachments',
		attachmentsBlocksSpinner: '//div[@class="zimbra-client_attachment-grid_attachments"]//span[contains(@class, "blocks_spinner")]',
		attachmentRemove: 'button*=Remove',
		attachmentPaperClip: '//div[contains(@title, "Attachments")]',
		attachFromComputer: 'div=Attach from my computer',
		mediaMenuFirstImg: "div:nth-of-type(1) > div.blocks_card_square[draggable='true'][role='button']:nth-of-type(1)",
		userIcon: 'div.zimbra-client_header-actions_headerActionTitle',
		condensedMessage: '//div[@class="zimbra-client_condensed-message_message"]',
		uncollapseCondesedMessagesButton: 'button.zimbra-client_condensed-message-overflow-indicator_button',
		smimeSelectedOperation: '//span[contains(@class,"zimbra-client_composer_selectedOperation")]',
		popoverMenuSearchInput: '//div[contains(@class, "blocks_popover_popper")]//input',
		composeField: '//div[@class="zimbra-client_composer_fields"]',
		messageSubjectSelector: (mailSubject) => 'h4.zimbra-client_mail-list-item_subject[title*="' + mailSubject + '"]',
		folderItem: (folderName) => 'a.zimbra-client_folder-list_itemLink[title="' + folderName + '"]',
		popoverContextMenuItem: (itemText) => '//div[contains(@class, "blocks_popover_popper")]//a[.="' + itemText + '"]',
		blocksDialogButton: (buttonText) => '//div[contains(@class, "blocks_dialog_overlay")]//button[text()="' + buttonText + '"]',
		mailSubjectCheckBox: (mailsubject) => '//div[contains(@class, "zimbra-client_mail-list-item")]/div[.//.="' + mailsubject + '"]//input[@type="checkbox"]',

		// Logout
		notification: '.zimbra-client_notifications_label',
		smimeStatus: 'span.zimbra-client_viewer_smimeStatusMsg',
		boldIcon: 'button[title="Bold"]',
		italicIcon: 'button[title="Italic"]',
		underLineIcon: 'button[title="Underline"]',
		ccBccButton: '//button[text()="CC/BCC"]',
		hideCcBccButton: '//button[text()="Hide CC/BCC"]',
		tofield: '//button[text()="To"]/following-sibling::div//input',
		ccfield: '//button[text()="Cc"]/following-sibling::div//input',
		bccfield: '//button[text()="Bcc"]/following-sibling::div//input',
		toFieldFilledBubble: '//button[.="To"]/following-sibling::div//div[@role="button"]',
		saveDraftTime: '//span[@class="zimbra-client_gui-rich-text-area_components_toolbar_saved"]',
		readPaneSubjectTitle: '//div.zimbra-client_mail-pane_readPane//div.zimbra-client_viewer-title_headerText',
		blockSpinner: 'div.blocks_spinner_blockSpinner',
		replyButton: '//button//span[text()="Reply"]',
		forwardButton: '//button//span[text()="Forward"]',
		moveButton: '//button//span[text()="Move"]',
		sortButton: '//div[contains(@class,"zimbra-client_mail-list-header_row")]//button',
		groupByConversation: '//span[text()="Group by Conversations"]',
		attachmentGrid: '//div[contains(@class, "zimbra-client_attachment-grid_attachments")]',
		proceedInDialog: '//div[contains(@class,"zimbra-client_modal-dialog_dialog")]//button[text()="Proceed"]',
		warningDialog: '//div[@role="dialog"]//h2[.="Cannot encrypt and send"]',
		sendwithoutEncryptButton: '//button[text()="Send without encrypting"]',
		contactStatus: '//div[contains(@class,"zimbra-client_viewer_smimeMsgContactStatusContainer")]',
		createNewContact: '//button[text()="Create new contact"]',
		addSenderPublicCerti: '//button[.="Add certificate to sender\'s contact information"]'
	},

	message: {
		body: null,
		subject: null,
		newSubject: null,
		toRecipients: null,
		ccRecipients: null,
		bccRecipients: null,
		messageType: null,
		attachment: null,
		inlineImage: null // assigned true or false
	},

	Users: {},

	// ********** Action Functions **********
	async composeAndSendMessage(message, smimeOption)  {
		await this.clickNewMessageButton();
		if (smimeOption !== null) {
			await this.selectSMIMEType(smimeOption);
		}

		await this.enterMailSubject(message.subject);

		await this.enterRecipient(textfield.T_TO, message.toRecipients);
		if (message.ccRecipients !== null) {
			await this.waitForAutoSaveDraftRequest();
			await this.enterRecipient(textfield.T_CC, message.ccRecipients);
		}

		if (message.bccRecipients !== null) {
			await this.waitForAutoSaveDraftRequest();
			await this.enterRecipient(textfield.T_BCC, message.bccRecipients);
		}

		if (message.attachment !== null) {
			await this.addAttachmentFromLocal(message.attachment);
			await utils.waitUntilDisappear(this.locators.attachmentsBlocksSpinner);
		}

		if (message.inlineImage !== null && message.inlineImage) {
			await this.attachPhotoFromEmail();
		}

		await this.enterPlainTextBodyContent(message.body);
		await this.clickSendbutton();
		await app.client.pause(2000);
	},

	// Upload file from local via viewer bottom bar attachment button
	async addAttachmentFromLocal(filePath) {
		await app.client.click(this.locators.attachmentPaperClip).click('div=' + option.O_ATTACH_FROM_MY_COMPUTER);
		await this.uploadFile(filePath);
	},

	async attachPhotoFromEmail() {
		await app.client.click(this.locators.attachmentPaperClip).click('div=' + option.O_ATTACH_PHOTO_FROM_EMAIL);
		await app.client.pause(1000);
		await app.client.waitForExist(this.locators.mediaMenuFirstImg, utils.elementExistTimeout);
		await app.client.click(this.locators.mediaMenuFirstImg);
		await app.client.waitForExist(this.locators.messageBodyInlineImage, utils.elementExistTimeout);
		await app.client.pause(2000);
	},

	// Upload file
	async uploadFile(filePath) {
		await app.client.waitForExist('input[type="file"]', utils.elementExistTimeout);
		await app.client.chooseFile('input[type="file"]', filePath);
		await app.client.pause(5000);
	},

	async selectMessage(mailSubject) {
		if (Array.isArray(mailSubject)) {
			await app.client.waitForExist(this.locators.mailSubjectCheckBox(mailSubject[0]));
			for (const subject of mailSubject) {
				await app.client.click(this.locators.mailSubjectCheckBox(subject));
			}
		} else {
			let subjectElement = this.locators.messageSubjectSelector(mailSubject);
			await app.client.waitForExist(subjectElement);
			await app.client.click(subjectElement);
			await app.client.pause(3000);
			await app.client.waitUntil(async () => !(await app.client.isExisting(this.locators.blockSpinner)), utils.elementExistTimeout);
			await app.client.pause(2000);
		}
	},

	async getSmimeContactStatus() {
		return await app.client.getText(this.locators.contactStatus);
	},

	async createContactFromSmimeStatus() {
		await app.client.click(this.locators.createNewContact);
		await app.client.pause(1000);
	},

	async addSenderPublicCertiFromSmimeStatus() {
		await app.client.click(this.locators.addSenderPublicCerti);
		await app.client.pause(1000);
	},

	async selectFolder(folderName) {
		await app.client.click(this.locators.folderItem(folderName));
		await app.client.pause(2000);
	},

	async openCondensedMessage(index = 0) {
		if (await app.client.isExisting(this.locators.uncollapseCondesedMessagesButton)) {
			await app.client.click(this.locators.uncollapseCondesedMessagesButton);
		}
		let condensedMessage = this.locators.condensedMessage + '[' + (index + 1) + ']';
		await app.client.waitForExist(condensedMessage);
		await app.client.click(condensedMessage);
		await app.client.pause(4000);
	},

	async enterHTMLbodyContent(htmlType, value) {
		await this.selectToolBarOption(htmlType);
		await app.client.addValue(this.locators.messageBody, value);
		await app.client.pause(3000);
		await this.selectToolBarOption(htmlType);
	},

	async enterPlainTextBodyContent(value) {
		await app.client.addValue(this.locators.messageBody, value);
		await this.waitForAutoSaveDraftRequest();
	},

	async enterBodyContentOnReplyForward(value) {
		await app.client.keys(value);
		await this.waitForAutoSaveDraftRequest();
	},

	async selectToolBarOption(buttonName) {
		switch (buttonName){
			case option.O_BOLD:
				await app.client.click(this.locators.boldIcon);
				break;
			case option.O_ITALIC:
				await app.client.click(this.locators.italicIcon);
				break;
			case option.O_UNDERLINE:
				await app.client.click(this.locators.underLineIcon);
				break;
			default:
				break;
		}
	},

	async clickNewMessageButton() {
		await app.client.click(this.locators.newMessageButton);
	},

	async enterRecipient(recipientType = textfield.T_TO, email) {
		if (recipientType === textfield.T_CC || recipientType === textfield.T_BCC) {
			if ((await app.client.isExisting(this.locators.ccBccButton)))
				await app.client.click(this.locators.ccBccButton);
		}
		await this.waitForAutoSaveDraftRequest();
		switch (recipientType){
			case textfield.T_TO:
				await app.client.setValue(this.locators.tofield, email);
				await app.client.pause(1000);
				break;
			case textfield.T_CC:
				await app.client.setValue(this.locators.ccfield, email);
				await app.client.pause(1000);
				break;
			case textfield.T_BCC:
				await app.client.setValue(this.locators.bccfield, email);
				await app.client.pause(1000);
				break;
			default:
				break;
		}
		await app.client.keys('Enter');
		await app.client.pause(2000);
	},

	async enterMailSubject(subject) {
		await app.client.setValue(this.locators.subject, subject);
	},

	async clickSendbutton() {
		await app.client.waitForEnabled(this.locators.sendButton, utils.elementExistTimeout);
		await app.client.click(this.locators.sendButton);
		//await app.client.pause(5000);
		await app.client.waitUntil(async() => {
			if (!(await app.client.getText(this.locators.notification)).includes('Message sent')) {
				//await app.client.waitForEnabled(this.locators.sendButton, 3000);
				if (await app.client.isEnabled(this.locators.sendButton)) {
					await app.client.click(this.locators.sendButton);
					await app.client.pause(3000);
				}
				return false;
			}
			return true;
		}, utils.elementExistTimeout, 'Toast meesage after send button click not appear');
		await app.client.pause(1000);
	},

	async selectSMIMEType(smimeOption = option.O_SIGN) {
		await app.client.click(this.locators.smimeDropDown).click('span=' + smimeOption).pause(3000);
	},

	async getComposeMailSMIMEOperation () {
		return await app.client.getText(this.locators.smimeSelectedOperation);
	},

	async switchToView(view) {
		let isConversation = view === option.O_GROUP_BY_CONVERSATION;

		await app.client.click(this.locators.sortButton).pause(1000);
		let isConversationEnable = await app.client.isExisting(this.locators.groupByConversation + '/preceding-sibling::span');

		if (isConversation === !isConversationEnable) {
			await app.client.click(this.locators.groupByConversation);
			await app.client.waitForExist(this.locators.messageListHeader, utils.elementExistTimeout);
			await app.client.pause(3000);
		} else {
			await app.client.click(this.locators.sortButton).pause(1000);
		}
	},

	async clickMessageViewerButton(buttonName) {
		switch (buttonName) {
			case button.B_REPLY:
				await app.client.click(this.locators.replyButton);
				break;
			case button.B_FORWARD:
				await app.client.click(this.locators.forwardButton);
				break;
			default:
				break;
		}
		await app.client.waitForExist(this.locators.sendButton, utils.elementExistTimeout);
	},

	async clickEllipsisIcon() {
		await app.client.click('input#__zm_toggle__');
		await app.client.pause(1000);
	},

	async sendMessage(messageType, toReceiver, addInlineAttachment = false, fileAttachmentPath = null, ccReceiver = null, bccReceiver = null) {
		let messageObject = Object.create(this.message);
		messageObject.subject = 'subject ' + utils.getUniqueString();
		messageObject.body = 'body ' + utils.getUniqueString();
		messageObject.toRecipients = toReceiver;
		messageObject.ccRecipients = ccReceiver;
		messageObject.bccRecipients = bccReceiver;
		messageObject.inlineImage = addInlineAttachment;
		messageObject.attachment = fileAttachmentPath;

		await this.composeAndSendMessage(messageObject, messageType);
		return messageObject;
	},

	async sendMessageUsingSoap(sender, toReceiver, subject, body) {
		let senderAuthToken = await soap.getAccountAuthToken(sender);
		await soap.sendMessage(senderAuthToken, toReceiver, subject, body);
		await this.selectFolder(folderLabel.F_INBOX);
		await app.client.pause(3000);
	},

	async injectMessage(account, filePath, mimeMessageSubject, folderName) {
		let authToken = await soap.getAccountAuthToken(account);
		await soap.injectMime(authToken, filePath, folderName);
		await this.selectFolder(folderLabel.F_INBOX);
		await app.client.pause(3000);
	},

	async proceedToLostAttachment() {
		await app.client.waitForExist(this.locators.proceedInDialog, utils.elementExistTimeout);
		await app.client.click(this.locators.proceedInDialog);
	},

	async isWarningDialogAppear() {
		await app.client.waitForExist(this.locators.warningDialog, utils.elementExistTimeout);
		return await app.client.isExisting(this.locators.warningDialog);
	},

	async clickSendWithoutEncrypt() {
		await utils.pressButton(button.B_OK);
		await utils.sleep(2000);
		await app.client.waitForVisible(this.locators.sendButton, 3000);
	},

	async replyMessage(replyMessage, proceedToLostAttachment = false, isMessageView = false) {
		await this.selectMessage(replyMessage.subject);
		await this.clickMessageViewerButton(button.B_REPLY);

		if (isMessageView) {
			await this.enterBodyContentOnReplyForward(replyMessage.body);
		} else {
			await this.enterPlainTextBodyContent(replyMessage.body);
		}
		await this.selectSMIMEType(replyMessage.messageType);

		if (proceedToLostAttachment) {
			await this.proceedToLostAttachment();
		}

		if (replyMessage.attachment !== null) {
			await this.addAttachmentFromLocal(replyMessage.attachment);
		}

		if (replyMessage.inlineImage !== null && replyMessage.inlineImage ) {
			await this.attachPhotoFromEmail();
		}
		await app.client.pause(1000);
		await this.clickSendbutton();
	},

	async replyMessageUsingMessageView(replyMessage, proceedToLostAttachment = false) {
		await this.replyMessage(replyMessage, proceedToLostAttachment, true);
	},

	async forwardMessage(forwardMessage, proceedToLostAttachment = false) {
		await this.selectMessage(forwardMessage.subject);
		await this.clickMessageViewerButton(button.B_FORWARD);
		await this.enterPlainTextBodyContent(forwardMessage.body);
		await this.enterRecipient(textfield.T_TO, forwardMessage.toRecipients);
		await this.selectSMIMEType(forwardMessage.messageType);
		if (proceedToLostAttachment) {
			await this.proceedToLostAttachment();
			await app.client.pause(3000);
		}

		if (forwardMessage.newSubject !== null) {
			await this.enterMailSubject(forwardMessage.newSubject);
		}

		if (forwardMessage.attachment !== null) {
			await this.addAttachmentFromLocal(forwardMessage.attachment);
		}

		if (forwardMessage.inlineImage !== null && forwardMessage.inlineImage ) {
			await this.attachPhotoFromEmail();
		}

		if ( !await app.client.isExisting(this.locators.toFieldFilledBubble) ) {
			await this.enterRecipient(textfield.T_TO, forwardMessage.toRecipients);
		}
		await this.clickSendbutton();
		await app.client.pause(3000);
	},

	async setView(email, view) {
		let adminAuthToken = await soap.getAdminAuthToken();
		let accountId = await soap.getAccountId(adminAuthToken, email);
		await soap.modifyAccount(adminAuthToken, accountId, 'zimbraPrefGroupMailBy', view);
		this.Users[email] = view;
	},

	async setConversationView(email) {
		if (typeof this.Users[email] === 'undefined' || this.Users[email] !== 'conversation')
			await this.setView(email, 'conversation');
	},

	async setMessageView(email) {
		if (typeof this.Users[email] === 'undefined' || this.Users[email] !== 'message')
			await this.setView(email, 'message');
	},

	// ********** Helper Functions **********
	async getReadingPaneContent(html = false) {
		if (html)
			return await app.client.getHTML(this.locators.messageContent);
		return await app.client.getText(this.locators.messageContent);
	},

	async getToastMessage() {
		await app.client.waitForExist(this.locators.notification, utils.elementExistTimeout);
		return await app.client.getText(this.locators.notification);
	},

	async getSmimeStatusFromReadingPane() {
		if (await app.client.isExisting(this.locators.smimeStatus)) {
			await app.client.waitForEnabled(this.locators.smimeStatus);
			return (await app.client.getText(this.locators.smimeStatus))[0];
		}
		return null;
	},

	async getCurrentTimestamp() {
		if (await app.client.isExisting(this.locators.saveDraftTime)) {
			let timeStamp = await this.trimTime(await app.client.getText(this.locators.saveDraftTime));
			await app.client.pause(1000);
			return timeStamp;
		}
		return null;
	},

	async isMessagePresent(mailSubject) {
		return await app.client.isExisting(this.locators.messageSubjectSelector(mailSubject));
	},

	async isAttachmentPresent(attachmentName) {
		await app.client.pause(3000);
		return await app.client.isExisting(this.locators.attachmentGrid + "//div[contains(text(),'" + attachmentName.substring(0,7) + "')]");
	},

	async deleteMessage(mailSubject) {
		await this.selectMessage(mailSubject);
		await utils.pressButton(button.B_DELETE);
		await app.client.waitForExist(this.locators.notification, utils.elementExistTimeout);
	},

	async deleteMessageFromTrash(mailSubject) {
		await this.selectFolder(folderLabel.F_TRASH);
		await this.selectMessage(mailSubject);
		await utils.pressButton(button.B_DELETE);
		await utils.pressButton(button.B_OK);
		await app.client.waitForExist(this.locators.notification, utils.elementExistTimeout);
		await this.selectFolder(folderLabel.F_INBOX);
	},

	async deleteMessagePermanently(mailSubject) {
		await this.deleteMessage(mailSubject);
		await this.deleteMessageFromTrash(mailSubject);
	},

	async trimTime(input) {
		let trimIndex = input.lastIndexOf(':');
		return input.substring(trimIndex - 2, trimIndex + 3);
	},

	// ********** Wait Functions **********
	async waitForMailListToLoad() {
		await app.client.waitForExist(this.locators.messageList, utils.elementExistTimeout);
	},

	async waitForAutoSaveDraftRequest() {
		await app.client.pause(2000);
		await app.client.waitForExist(this.locators.saveDraftTime, utils.elementExistTimeout);
		await app.client.pause(1000);
	},

	// ********** Verification Functions **********
	async verifyMessageBody(message) {
		const msg = await app.client.getText(this.locators.messageContent);
		if (msg.includes(message.body))
			return true;
		return false;
	},

	async verifyAttachmentInReadingPane(attachmentName) {
		if (!await app.client.isExisting(this.locators.attachments)) {
			return false;
		}
		const name = await app.client.getText(this.locators.attachments);
		if (name.includes(attachmentName.substring(0,6)))
			return true;
		return false;
	},

	async verifyInlineImageInReadingPane() {
		let imgCount = await app.client.elements(this.locators.inlineImageInMessageBody).then((elems) => elems.value.length);
		if (imgCount > 1 ) return true;
		return (await app.client.isExisting(this.locators.inlineImageInMessageBody) &&
			!await app.client.isExisting(this.locators.blockquoteInlineImage));
	},

	async verifyInlineImageInBlockQuote() {
		return await app.client.isExisting(this.locators.blockquoteInlineImage);
	},

	async verifySmimeStatusPresentInReadingPane() {
		return await app.client.isExisting(this.locators.smimeStatus);
	}
};