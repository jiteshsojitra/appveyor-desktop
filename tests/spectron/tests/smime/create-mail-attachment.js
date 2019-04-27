const config = require('../../conf/config').getConfig();
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const mail = require('../../pages/mail');
const option = require('../../framework/elements/option');
const textfield = require('../../framework/elements/textfield');
const path = require('path');

describe('Create smime mail with attachment', function() {
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


	it('Smoke | Compose signed message with file attachment | C1810331', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		messageObject.subject = 'signed message subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;
		let fileName = 'BMP_Image.bmp';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		messageObject.attachment = filePath;

		// Compose message
		await mail.composeAndSendMessage(messageObject, option.O_SIGN);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of signed message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify signed message body value');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment present in reading pane');
	});


	it('Smoke | Compose encrypted message with file attachment | C1900678', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		messageObject.subject = 'Encrypted message subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;
		let fileName = 'JPEG_Image.jpg';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		messageObject.attachment = filePath;

		// Compose message
		await mail.composeAndSendMessage(messageObject, option.O_SIGN_AND_ENCRYPT);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of signed message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify signed message body value');
		await mail.verifyAttachmentInReadingPane(fileName).should.eventually.equal(true, 'Verify attachment presence in reading pane');
	});


	it('BHR | Compose signed message with inline attachment | C1823080', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		messageObject.subject = 'signed message subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;

		// Compose message
		await mail.clickNewMessageButton();
		await mail.selectSmimeType(option.O_SIGN);
		await mail.enterMailSubject(messageObject.subject);
		await mail.enterPlainTextBodyContent(messageObject.body);
		await mail.enterRecipient(textfield.T_TO, messageObject.toRecipients);
		await mail.attachPhotoFromEmail();
		await mail.clickSendButton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of signed message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify signed message body value');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline images attachment displayed in message body');
	});


	it('BHR | Compose encrypted message with inline attachment | C1823081', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		messageObject.subject = 'Encrypted message subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;

		// Compose message
		await mail.clickNewMessageButton();
		await mail.selectSmimeType(option.O_SIGN_AND_ENCRYPT);
		await mail.enterMailSubject(messageObject.subject);
		await mail.enterPlainTextBodyContent(messageObject.body);
		await mail.enterRecipient(textfield.T_TO, messageObject.toRecipients);
		await mail.attachPhotoFromEmail();
		await mail.clickSendButton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of signed message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify signed message body value');
		await mail.verifyInlineImageInReadingPane().should.eventually.equal(true, 'Verify inline image attachment displayed in message body');
	});
});