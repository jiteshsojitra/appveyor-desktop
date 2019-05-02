const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const settings = require('../../../pages/settings');
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const mail = require('../../../pages/mail');
const path = require('path');

describe('Reply smime mail with attachment in conversation view', function() {
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


	it('Application-Bug-SXmoke | Reply signed message contains file attachment as signed using conversation view | C1921887 | PREAPPS-2361', async() => {
		let fileName = 'PPT_Document.ppt';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user2;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify replied message is signed');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify smime status displayed in message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('Smoke | Reply signed message contains inline image attachment as signed using conversation view | C1921888', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify replied message is signed');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify smime status displayed in message');
	});


	it('BHR | Reply signed message contains file attachment as signed by adding an attachment using conversation view | C1918549', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
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
		let replyFileAttachment = 'PNG_Image.png';
		replyMessage.attachment = path.join(utils.baseDir, '/data/files/' + replyFileAttachment);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.verifyAttachmentInReadingPane('PNG_Image.png').should.eventually.equal(true, 'Verify attachment present in reading pane');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed', 'Verify smime status of signed message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body	, 'Verify message body value');
	});


	it('BHR | Reply encrypted message contains file attachment as encrypted by adding an attachment using conversation view | C1918550', async() => {
		let fileName = 'PPT_Document.ppt';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		let replyFileAttachment = 'JPEG_Image.jpg';
		replyMessage.attachment = path.join(utils.baseDir, '/data/files/' + replyFileAttachment);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.verifyAttachmentInReadingPane('JPEG_Image.jpg').should.eventually.equal(true, 'Verify attachment present in reading pane');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted', 'Verify smime status of signed and encrypted message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body	, 'Verify message body value');
	});


	it('Smoke | Reply encrypted message contains file attachment as encrypted using conversation view | C1976461', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user2;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify replied message smime status does not displayed in message');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('Smoke | Reply encrypted message contains inline image attachment as encrypted using conversation view | C1976462', async() => {
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
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify replied message is signed');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
	});


	it('Functional | Reply encrypted message as normal by adding an attachment using conversation view | C1898583', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		let fileName = 'PDF_Document.pdf';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let attachment = filePath;

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		replyMessage.attachment = attachment;
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');
		await mail.isAttachmentPresent(fileName).should.eventually.equal(true, 'Verify attachment present in reply message');
	});


	it('BHR | Reply signed message contains file attachment as encrypted using conversation view | C1921889', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user2;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify replied message is signed');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify smime status displayed in message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('BHR | Reply signed message contains inline image attachment as encrypted using conversation view | C1921890', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify replied message is signed');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify smime status displayed in message');
	});


	it('Functional | Reply encrypted message contains file attachment as normal using conversation view | C1976457', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('Functional | Reply encrypted message contains inline image attachment as normal using conversation view | C1976460 ', async() => {
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
		await mail.replyMessage(replyMessage,true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
	});


	it('BHR | Reply encrypted message contains file attachment as signed using conversation view | C1976459', async() => {
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal('Signed by ' + config.user2, 'Verify replied message smime status does not displayed in message');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('BHR | Reply encrypted message contains inline image attachment as signed using conversation view | C1976458', async() => {
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
		await common.loginToClient(messageObject.toRecipients);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify replied message is signed');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
	});


	it('Functional | Reply normal message contains inline image attachment as signed using conversation view | C1898584', async() => {
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessage(replyMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(true, 'Verify smime status present in replied message');
	});


	it('Functional | Reply normal message contains file attachment as normal using conversation view | C1918551', async() => {
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in replied message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment presence in reading pane of the replied message');
	});


	it('Functional | Reply normal message contains inline attachment as normal using conversation view | C1918552', async() => {
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in replied message');
	});


	it('Functional | Reply normal message contains file attachment as signed using conversation view | C1918553', async() => {
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user2, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment presence in reading pane of the replied message');
	});


	it('Functional | Reply normal message contains file attachment as encrypted using conversation view | C1918554', async() => {
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user2, 'Verify smime status of message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment presence in reading pane of the replied message');
	});


	it('Functional | Reply normal message contains inline attachment as encrypted using conversation view | C1918555', async() => {
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
		await mail.replyMessage(replyMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(false, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user2, 'Verify smime status of message');
	});


	it('Functional | Reply normal message contains file attachment as normal using conversation view | C1918548', async() => {
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
		let replyFileName = 'PNG_Image.png';
		replyMessage.attachment = path.join(utils.baseDir, '/data/files/' + replyFileName);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.verifyAttachmentInReadingPane(replyFileName).should.eventually.equal(true, 'Verify attachment present in reading pane');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Functional | Reply signed message contains file attachment as normal using conversation view | C1913257', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.toRecipients = config.user1;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(replyMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify replied message does not contain file attachment');
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify smime status displayed in message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('Functional | Reply signed message contains inline image attachment as normal using conversation view | C1919548', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessage(replyMessage,true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify replied message smime status does not displayed in message');
		await mail.openCondensedMessage();
		await (await mail.getReadingPaneContent())[0].should.contains(messageObject.body, 'Verify mail to reply opened with correct mail body');
		await (await mail.getReadingPaneContent())[1].should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image present in message body');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed', 'Verify smime status displayed in message');
	});
});