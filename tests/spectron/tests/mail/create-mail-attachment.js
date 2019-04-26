const app = require('../../framework/app-config');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const mail = require('../../pages/mail');
const folder = require('../../framework/elements/folder');
const soap = require('../../framework/soap-client');
const path = require('path');

describe('Create mail with attachment', function() {
	this.timeout(0);
	let account = {};

	async function beforeEachTest() {
		account = await common.createAccount();
		await common.loginBeforeTestRun(account.emailAddress);
	}

	before(async () => {
		await common.startApplication();
		utils.configChai();
	});
	after(async() => {
		await common.stopApplication();
	});

	beforeEach(async () => {
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


	it('Smoke | Compose basic mail with file attachment | C1295360', async() => {
		let mailToAccount = await common.createAccount();
		let mailCcAccount = await common.createAccount();
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString(),
		messageObject.body = 'body' + utils.getUniqueString();
		messageObject.toRecipients = mailToAccount.emailAddress;
		messageObject.ccRecipients = mailCcAccount.emailAddress;
		let fileName = 'BMP_Image.bmp';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		messageObject.attachment = filePath;

		await mail.composeAndSendMessage(messageObject, null);
		await mail.selectFolder(folder.F_SENT);
		await app.client.waitForExist(mail.locators.messageSubjectSelector(messageObject.subject));
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present in sent folder');

		let getMessageResponseMailTo = await soap.searchAndGetMessage(mailToAccount.authToken, messageObject.subject);
		getMessageResponseMailTo.textPlain.should.eql(messageObject.body, 'Verify mail body text of mailTo');
		getMessageResponseMailTo.attachmentList.should.contain(fileName, 'Verify file attachment of mailTo');
		let getMessageResponseMailCc = await soap.searchAndGetMessage(mailCcAccount.authToken, messageObject.subject);
		getMessageResponseMailCc.textPlain.should.eql(messageObject.body, 'Verify mail body text of mailCc');
		getMessageResponseMailCc.attachmentList.should.contain(fileName, 'Verify file attachment of mailCc');
	});


	it('BHR | Compose basic mail and attach inline image from email | C648038', async() => {
		let mailToAccount = await common.createAccount();
		let messageObject = Object.create(mail.message);
		messageObject.body = 'body' + utils.getUniqueString();
		messageObject.subject = 'subject' + utils.getUniqueString(),
		messageObject.toRecipients = mailToAccount.emailAddress;
		messageObject.inlineImage = true;
		let inlineFileName = 'zimbra-logo-color copy 3.png';
		let fileName = 'inline-image-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);

		await soap.injectMime(account.authToken, filePath);
		await mail.composeAndSendMessage(messageObject, null);

		let getMessageResponse = await soap.searchAndGetMessage(mailToAccount.authToken, messageObject.subject);
		getMessageResponse.textPlain.should.eql(messageObject.body, 'Verify mail to account mail body');
		getMessageResponse.inlineAttachmentMessagePart.should.eql(true, 'Verify inline attachment exist');
		getMessageResponse.attachmentList.should.eql(inlineFileName, 'Verify inline attachment is in mail body');
	});
});