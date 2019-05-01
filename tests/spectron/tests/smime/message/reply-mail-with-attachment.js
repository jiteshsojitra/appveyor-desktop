const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const settings = require('../../../pages/settings');
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const mail = require('../../../pages/mail');
const path = require('path');

describe('Reply smime mail with attachment in message view', function() {
	this.timeout(0);

	async function beforeEachTest() {
		await mail.setMessageView(config.user1);
		await mail.setMessageView(config.user2);
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


	it('Smoke | Reply signed message contains file attachment as signed using message view | C1982094', async() => {
		let fileName = 'PDF_Document.pdf';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false,filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
	});


	it('Smoke | Reply signed message contains inline attachment as signed using message view | C1982095', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.clickEllipsisIcon();
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image is not present in message body');
	});


	it('BHR | Reply signed message contains file attachment as normal using message view | C1982092', async() => {
		let fileName = 'PDF_Document.pdf';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);

		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false,filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
	});


	it('Application-Bug-FXunctional | Reply signed message contains inline attachment as normal using message view | C1982093 | PREAPPS-2359', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
	});


	it('BHR | Reply signed message contains file attachment as encrypted using message view | C1982096', async() => {
		let fileName = 'PDF_Document.pdf';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);

		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false,filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
	});


	it('BHR | Reply signed message contains inline attachment as encrypted using message view | C1982097', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.clickEllipsisIcon();
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyInlineImageInBlockQuote().should.eventually.equal(true, 'Verify inline image present in message body');
	});


	it('Smoke | Reply encrypted message contains file attachment as encrypted using message view | C1976461', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Smoke | Reply encrypted message contains inline image attachment as encrypted using message view | C1976462', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Functional | Reply encrypted message contains file attachment as normal using message view | C1976457', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage, false, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Application-Bug-BXHR | Reply encrypted message contains inline image attachment as normal using message view | C1976460 | PREAPPS-2359', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage, true, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply encrypted message contains file attachment as signed using message view | C1976459', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage, false, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply encrypted message contains inline image attachment as signed using message view | C1976458', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Smoke | Reply encrypted message contains file attachment as encrypted by adding file attachment | C1983438', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		let replyFileAttachment = 'PNG_Image.png';
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();
		replyMessage.attachment = path.join(utils.baseDir, '/data/files/' + replyFileAttachment);

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.verifyAttachmentInReadingPane(replyFileAttachment).should.eventually.equal(true, 'Verify replied message body contains reply file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Functional | Reply normal message contains file attachment as normal by adding file attachment using message view | C1983436', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		let replyFileAttachment = 'PNG_Image.png';
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();
		replyMessage.attachment = path.join(utils.baseDir, '/data/files/' + replyFileAttachment);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.verifyAttachmentInReadingPane(replyFileAttachment).should.eventually.equal(true, 'Verify replied message body contains reply file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply signed message contains file attachment as encrypted by adding inline attachment | C1983437', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();
		replyMessage.inlineImage = true;

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + replyMessage.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline images attachment displayed in message body');
	});


	it('Functional | Reply normal message contains file attachment as normal using message view | C1982086', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
	});


	it('Functional | Reply normal message contains inline attachment as normal using message view | C1982087', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, true, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
	});


	it('Functional | Reply normal message contains file attachment as signed using message view | C1982088', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
	});


	it('Functional | Reply normal message contains inline attachment as signed using message view | C1982089', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, true, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
	});


	it('Functional | Reply normal message contains file attachment as encrypted using message view | C1982090', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment not present in replied message');
	});


	it('Functional | Reply normal message contains inline attachment as encrypted using message view | C1982091', async() => {
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
	});
});