const option = require('../../framework/elements/option');
const config = require('../../conf/config').getConfig();
const textfield = require('../../framework/elements/textfield');
const folder = require('../../framework/elements/folder');
const button = require('../../framework/elements/button');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const mail = require('../../pages/mail');
const path = require('path');

describe('Draft smime mail', function() {
	this.timeout(0);

	async function beforeEachTest() {
		await mail.setConversationView(config.user1);
		await mail.setConversationView(config.user2);
		await common.loginBeforeTestRun(config.user1);
	}

	before(async() => {
		await common.startApplication();
		utils.configChai();
	});
	after(async() => {
		await common.stopApplication();
	});

	beforeEach(async() => {
		try {
			await beforeEachTest();
        } catch (error) {
			console.log ("Error occured in before each: ", error); // eslint-disable-line
			await beforeEachTest();
        }
	});

	afterEach(function() {
		utils.takeScreenShotOnFailed(this.currentTest);
	});


	it('Smoke | Open saved signed draft message, modify and send it | C1976610', async() => {
		let bodyText1 = 'body' + utils.getUniqueString();
		let bodyText2 = 'Appended body' + utils.getUniqueString();
		let mailSubject = 'subject' + utils.getUniqueString();
		let toRecipients = config.user2;

		// Compose a signed message
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN);
		await mail.enterMailSubject(mailSubject);
		await mail.enterPlainTextBodyContent(bodyText1);
		await mail.enterRecipient(textfield.T_TO, toRecipients);

		// Wait for message to get auto saved
		await mail.waitForAutoSaveDraftRequest();

		// Go to draft and select the saved message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.selectMessage(mailSubject);

		// Modify the draft
		await mail.enterPlainTextBodyContent(bodyText2 + ' ');
		await utils.pressKey('Enter');

		// Send the message
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(toRecipients);
		await mail.isMessagePresent(mailSubject).should.eventually.equal(true);
		await mail.selectMessage(mailSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of signed message');
		let messageContent = await mail.getReadingPaneContent(true);
		await messageContent.should.contain(bodyText1, 'Verify initial string in signed message');
		await messageContent.should.contain(bodyText2, 'Verify appended string in signed message');
	});


	it('Smoke | Open saved encrypted draft message, modify and send it | C1976611', async() => {
		let bodyText1 = 'body' + utils.getUniqueString();
		let bodyText2 = 'Appended body' + utils.getUniqueString();
		let mailSubject = 'subject' + utils.getUniqueString();
		let toRecipients = config.user2;

		// Compose a signed message
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN_AND_ENCRYPT);
		await mail.enterMailSubject(mailSubject);
		await mail.enterPlainTextBodyContent(bodyText1);
		await mail.enterRecipient(textfield.T_TO, toRecipients);

		// Wait for message to get auto saved
		await mail.waitForAutoSaveDraftRequest();

		// Go to draft and select the saved message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.selectMessage(mailSubject);

		// Modify the draft
		await mail.enterPlainTextBodyContent(bodyText2 + ' ');
		await utils.pressKey('Enter');

		// Send the message
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(toRecipients);
		await mail.isMessagePresent(mailSubject).should.eventually.equal(true);
		await mail.selectMessage(mailSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of signed message');
		let messageContent = await mail.getReadingPaneContent(true);
		await messageContent.should.contain(bodyText1, 'Verify initial string in signed message');
		await messageContent.should.contain(bodyText2, 'Verify appended string in signed message');
	});


	it('BHR | Open saved signed draft message with file attachment, modify and send it | C1976612', async() => {
		let bodyText1 = 'body' + utils.getUniqueString();
		let bodyText2 = 'Appended body' + utils.getUniqueString();
		let mailSubject = 'subject' + utils.getUniqueString();
		let toRecipients = config.user2;
		let fileName = 'PPTX_Document.pptx';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);

		// Compose a signed message
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN);
		await mail.enterMailSubject(mailSubject);
		await mail.enterPlainTextBodyContent(bodyText1);
		await mail.enterRecipient(textfield.T_TO, toRecipients);
		await mail.addAttachmentFromLocal(filePath);

		// Wait for message to get auto saved
		await mail.waitForAutoSaveDraftRequest();

		// Go to draft and select the saved message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.selectMessage(mailSubject);

		// Modify the draft
		await mail.enterPlainTextBodyContent(bodyText2 + ' ');
		await utils.pressKey('Enter');

		// Send the message
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(toRecipients);
		await mail.isMessagePresent(mailSubject).should.eventually.equal(true);
		await mail.selectMessage(mailSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of signed message');
		let messageContent = await mail.getReadingPaneContent(true);
		await messageContent.should.contain(bodyText1, 'Verify initial string in signed message');
		await messageContent.should.contain(bodyText2, 'Verify appended string in signed message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment present in reading pane');
	});


	it('BHR | Open saved encrypted draft message with file attachment, modify and send it | C1976613', async() => {
		let bodyText1 = 'body' + utils.getUniqueString();
		let bodyText2 = 'Appended body' + utils.getUniqueString();
		let mailSubject = 'subject' + utils.getUniqueString();
		let toRecipients = config.user2;
		let fileName = 'PPTX_Document.pptx';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);

		// Compose a signed message
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN_AND_ENCRYPT);
		await mail.enterMailSubject(mailSubject);
		await mail.enterPlainTextBodyContent(bodyText1);
		await mail.enterRecipient(textfield.T_TO, toRecipients);
		await mail.addAttachmentFromLocal(filePath);

		// Wait for message to get auto saved
		await mail.waitForAutoSaveDraftRequest();

		// Go to draft and select the saved message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.selectMessage(mailSubject);

		// Modify the draft
		await mail.enterPlainTextBodyContent(bodyText2 + ' ');
		await utils.pressKey('Enter');

		// Send the message
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(toRecipients);
		await mail.isMessagePresent(mailSubject).should.eventually.equal(true);
		await mail.selectMessage(mailSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of signed message');
		let messageContent = await mail.getReadingPaneContent(true);
		await messageContent.should.contain(bodyText1, 'Verify initial string in signed message');
		await messageContent.should.contain(bodyText2, 'Verify appended string in signed message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment present in reading pane');
	});


	it('Functional | Reply to normal message as signed message, modify draft and send message | C1405371', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();

		// Add a normal message
		await mail.sendMessageUsingSoap(config.user2, config.user1, messageObject.subject, messageObject.body);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'Reply body' + utils.getUniqueString();
		let appendedBodyText = 'Appended body' + utils.getUniqueString();

		// Reply to the message
		await mail.selectMessage(messageObject.subject);
		await mail.clickMessageViewerButton(button.B_REPLY);
		await mail.selectSMIMEType(option.O_SIGN);
		await mail.enterPlainTextBodyContent(replyMessage.body);
		await mail.waitForAutoSaveDraftRequest();

		// Go to draft folder and open the composed message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.selectMessage('Re: ' + messageObject.subject);

		// Modify the draft
		await mail.enterPlainTextBodyContent(appendedBodyText + ' ');
		await utils.pressKey('Enter');

		// Send the message
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contains(appendedBodyText, 'Verify appended string in repliend signed message');
		await mail.getReadingPaneContent().should.eventually.contains(replyMessage.body, 'Verify intial string in replied signed message');
	});


	it.skip('Functional | Forward message containing attachment as encrypted message, modify draft and send message | C1976614 | PREAPPS-1488', async() => {
		let mimeMessageSubject = 'Single file attachment';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);

		// Inject the message with file attachment
		await mail.injectMessage(config.user1, filePath, mimeMessageSubject);

		// Forward the message in conversation view
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user2;
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		let appendedBodyText = 'Appended forward body' + utils.getUniqueString();

		await mail.selectMessage(mimeMessageSubject);
		await mail.clickMessageViewerButton(button.B_FORWARD);
		await mail.selectSMIMEType(forwardMessage.messageType);
		await mail.enterRecipient(textfield.T_TO, forwardMessage.toRecipients);
		await mail.enterPlainTextBodyContent(forwardMessage.body);
		await mail.waitForAutoSaveDraftRequest();

		// Go to draft and open the composed message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);

		// Modify the draft
		await mail.enterPlainTextBodyContent(appendedBodyText + ' ');
		await utils.pressKey('Enter');

		// Send the message
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contains(forwardMessage.body, 'Verify intial string in replied signed message');
		await mail.getReadingPaneContent().should.eventually.contains(appendedBodyText, 'Verify appended string in repliend signed message');
	});
});