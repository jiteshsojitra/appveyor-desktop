const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const utils = require('../../../framework/utils');
const soap = require('../../../framework/soap-client');
const common = require('../../../pages/common');
const settings = require('../../../pages/settings');
const mail = require('../../../pages/mail');
const path = require('path');

describe('Forward smime mail with attachment in message view', function() {
	this.timeout(0);

	async function beforeEachTest() {
		await mail.setMessageView(config.user1);
		await mail.setMessageView(config.user2);
		await mail.setMessageView(config.user3);
		await common.loginBeforeTestRun(config.user1);
	}

	before(async() => {
		await mail.setMessageView(config.user1);
		await mail.setMessageView(config.user2);
		await mail.setMessageView(config.user3);
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


	it('Smoke | Forward signed message contains file attachment as signed using message view | C1990396', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('BHR | Forward signed message contains file attachment as encrypted using message view | C1990397', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it.skip('Functional | Forward signed message contains file attachment as normal using message view | C1990395 | PREAPPS-2359', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.newSubject = 'subject' + utils.getUniqueString();
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage(forwardMessage.newSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');

		let forwardMessageResponse = await soap.searchAndGetMessage(await soap.getAccountAuthToken(config.user3), forwardMessage.newSubject);
		await forwardMessageResponse.attachment.should.equal(false, 'Verify file attachment not present in forwarded message');
		await forwardMessageResponse.textHtmlMessagePart.should.contain(forwardMessage.body, 'Verify forward message body content');
	});


	it('Smoke | Forward encrypted message contains file attachment as encrypted using message view | C2010544', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('BHR | Forward encrypted message contains file attachment as signed using message view | C2010543', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it.skip('Functional | Forward encrypted message contains file attachment as normal using message view | C2010542 | PREAPPS-2359', async() => {
		let authToken = await soap.getAccountAuthToken(config.user3);
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.newSubject = 'subject' + utils.getUniqueString();
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage(forwardMessage.newSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');

		let forwardMessageResponse = await soap.searchAndGetMessage(authToken, forwardMessage.newSubject);
		await forwardMessageResponse.attachment.should.equal(false, 'Verify no file attachment in forward message');
		await forwardMessageResponse.textHtmlMessagePart.should.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('Smoke | Forward encrypted message contains inline image attachment as encrypted by adding a file attachment using message view | C2010547', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardFileName = 'JPEG_Image.jpg';
		let forwardFilePath = path.join(utils.baseDir, '/data/files/' + forwardFileName);
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();
		forwardMessage.attachment = forwardFilePath;

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(forwardFileName).should.eventually.equal(true, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('BHR | Forward signed message contains inline image attachment as encrypted by adding inline attachment using message view | C2010546', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();
		forwardMessage.inlineImage = true;

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline images attachment displayed in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('Functional | Forward normal message contains file attachment as normal by adding a file attachment using message view | C2010545', async() => {
		let authToken = await soap.getAccountAuthToken(config.user2);
		let mimeMessageSubject = 'Single file attachment';
		let attachmentName = 'PDF_Document.pdf';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		let forwardFileName = 'JPEG_Image.jpg';
		let forwardFilePath = path.join(utils.baseDir, '/data/files/' + forwardFileName);
		forwardMessage.toRecipients = config.user2;
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.newSubject = 'subject' + utils.getUniqueString();
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();
		forwardMessage.attachment = forwardFilePath;

		await mail.injectMessage(config.user1, filePath, mimeMessageSubject);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage(forwardMessage.newSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');

		let forwardMessageResponse = await soap.searchAndGetMessage(authToken, forwardMessage.newSubject);
		await forwardMessageResponse.attachmentList.should.contain(attachmentName, 'Verify original file attachment in forward message');
		await forwardMessageResponse.attachmentList.should.contain(forwardFileName, 'Verify forwared file attachment in forward message');
		await forwardMessageResponse.textHtmlMessagePart.should.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it.skip('BHR | Forward normal message contains file attachment as encrypted using message view | C1990348 | PREAPPS-1488', async() => {
		let mimeMessageSubject = 'Single file attachment';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user2;
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.newSubject = 'subject' + utils.getUniqueString();
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		await mail.injectMessage(config.user1, filePath, mimeMessageSubject);
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it.skip('BHR | Forward normal message contains file attachment as signed using message view | C1990347 | PREAPPS-1488', async() => {
		let authToken = await soap.getAccountAuthToken(config.user2);
		let mimeMessageSubject = 'Single file attachment';
		let attachmentName = 'PDF_Document.pdf';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user2;
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.newSubject = 'subject' + utils.getUniqueString();
		forwardMessage.messageType = option.O_SIGN;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		await mail.injectMessage(config.user1, filePath, mimeMessageSubject);
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage(forwardMessage.newSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');

		let forwardMessageResponse = await soap.searchAndGetMessage(authToken, forwardMessage.newSubject);
		forwardMessageResponse.attachmentList.should.contain(attachmentName, 'Verify file attachment in forward message');
		forwardMessageResponse.textHtmlMessagePart.should.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('Functional | Forward normal message contains file attachment as normal using message view | C1990346', async() => {
		let authToken = await soap.getAccountAuthToken(config.user2);
		let mimeMessageSubject = 'Single file attachment';
		let attachmentName = 'PDF_Document.pdf';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user2;
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.newSubject = 'subject' + utils.getUniqueString();
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		await mail.injectMessage(config.user1, filePath, mimeMessageSubject);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage(forwardMessage.newSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');

		let forwardMessageResponse = await soap.searchAndGetMessage(authToken, forwardMessage.newSubject);
		forwardMessageResponse.attachmentList.should.contain(attachmentName, 'Verify file attachment in forward message');
		forwardMessageResponse.textHtmlMessagePart.should.contain(forwardMessage.body, 'Verify forward message mail body');
	});
});