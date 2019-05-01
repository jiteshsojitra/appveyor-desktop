const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const mail = require('../../../pages/mail');
const settings = require('../../../pages/settings');
const path = require('path');

describe('Forward smime mail with attachment in conversation view', function() {
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


	it('Smoke | Forward signed message contains file attachment as signed using conversation view | C1650984', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = messageObject.subject;
		forwardMessage.toRecipients = config.user3;
		forwardMessage.messageType = option.O_SIGN;
		forwardMessage.body = 'forward' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.isMessagePresent('Fwd: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed by ' + config.user2, 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment should not presence in reading pane of the forwarded message');
	});


	it('Smoke | Forward encrypted message contains file attachment as encrypted using conversation view | C1936604', async() => {
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
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted by ' + config.user2, 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('BHR | Forward normal message contains file attachment as normal using conversation view | C1908559', async() => {
		let mimeFile = 'jpg-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + mimeFile);
		let mimeMessageSubject = 'JPG file attachment';
		let mimeMessageAttachment = 'zimbra_image.jpg';

		// Inject the message with file attachment
		await mail.injectMessage(config.user1, filePath);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.toRecipients = config.user2;
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage('Fwd: ' + mimeMessageSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(mimeMessageAttachment).should.eventually.equal(true, 'Verify attachment presence in reading pane of the forwarded message');
	});


	it('Application-Bug-BXHR | Forward normal message contains file attachment as signed using conversation view | C1823086 | PREAPPS-1488', async() => {
		let mimeFile = 'jpg-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + mimeFile);
		let mimeMessageSubject = 'JPG file attachment';
		let mimeMessageAttachment = 'zimbra_image.jpg';

		// Inject the message with file attachment
		await mail.injectMessage(config.user1, filePath);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.toRecipients = config.user2;
		forwardMessage.messageType = option.O_SIGN;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage('Fwd: ' + mimeMessageSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed by ' + config.user2, 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(mimeMessageAttachment).should.eventually.equal(false, 'Verify attachment presence in reading pane of the forwarded message');
	});


	it('Application-Bug-BXHR | Forward normal message contains file attachment as encrypted using conversation view | C1908560 | PREAPPS-1488', async() => {
		let mimeFile = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + mimeFile);
		let mimeMessageSubject = 'Single file attachment';
		let mimeMessageAttachment = 'PDF_Document.pdf';

		// Inject the message with file attachment
		await mail.injectMessage(config.user1, filePath);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Forward message

		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.toRecipients = config.user2;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage('Fwd: ' + mimeMessageSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted by ' + config.user2, 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(mimeMessageAttachment).should.eventually.equal(false, 'Verify attachment presence in reading pane of the forwarded message');
	});


	it('BHR | Forward normal message contains file attachment as normal after adding file attachment using conversation view | C906307', async() => {
		let mimeFile = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + mimeFile);
		let mimeMessageSubject = 'Single file attachment';

		// Inject the message with file attachment
		await mail.injectMessage(config.user1, filePath);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		let fileName = 'PDF_Document.pdf';
		filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		forwardMessage.toRecipients = config.user2;
		forwardMessage.subject = mimeMessageSubject;
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		forwardMessage.attachment = filePath;
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.selectMessage('Fwd: ' + mimeMessageSubject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane of the forwarded message');
	});


	it('BHR | Forward signed message contains inline attachment as encrypted after adding inline attachment using conversation view | C1910992', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = messageObject.subject;
		forwardMessage.toRecipients = config.user3;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		forwardMessage.inlineImage = true;
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted by ' + config.user2, 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline images attachment displayed in message body');
	});


	it('BHR | Forward encrypted message contains inline attachment as encrypted after adding an attachment using conversation view | C1911985', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, true);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		let fileName = 'PDF_Document.pdf';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		forwardMessage.subject = messageObject.subject;
		forwardMessage.toRecipients = config.user3;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		forwardMessage.attachment = filePath;
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.isMessagePresent('Fwd: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted by ' + config.user2, 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane of the forwarded message');
	});


	it('Application-Bug-FXunctional | Forward signed message contains file attachment as normal using conversation view | C1650986 | PREAPPS-2359', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = messageObject.subject;
		forwardMessage.toRecipients = config.user3;
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.isMessagePresent('Fwd: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify attachment should not presence in reading pane of the forwarded message');
	});


	it('Functional | Forward signed message contains file attachment as encrypted using conversation view | C1650987', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.subject = messageObject.subject;
		forwardMessage.toRecipients = config.user3;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'Forward body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.isMessagePresent('Fwd: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted by ' + config.user2, 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value in forwarded message');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment should not presence in reading pane of the forwarded message');
	});


	it('Functional | Forward encrypted message contains file attachment as signed using conversation view | C1936557', async() => {
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
		forwardMessage.body = 'body' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed by ' + config.user2, 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});


	it('Application-Bug-FXunctional | Forward encrypted message contains file attachment as normal using conversation view | C1911986 | PREAPPS-1494', async() => {
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2, false, filePath);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		forwardMessage.body = 'forwardbody' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.forwardMessage(forwardMessage, true);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + forwardMessage.subject);
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(false, 'Verify no file attachment in forward message');
		await mail.getSmimeStatusFromReadingPane().should.eventually.equal(null, 'Verify signed status displayed in mailbody');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify forward message mail body');
	});
});