const option = require('../../framework/elements/option');
const config = require('../../conf/config').getConfig();
const textfield = require('../../framework/elements/textfield');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const mail = require('../../pages/mail');

describe('Create smime mail', function() {
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
			console.log ("Error occured in before each: ", error);
			await beforeEachTest();
		}
	});
	afterEach(function() {
		utils.takeScreenShotOnFailed(this.currentTest);
	});


	it('Smoke | Compose normal message and send it as encrypted | C1878070', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'body ' + utils.getUniqueString(),
		messageObject.subject = 'subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;

		// Compose message
		await mail.composeAndSendMessage(messageObject, option.O_SIGN_AND_ENCRYPT);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify message body value');
	});


	it('BHR | Compose HTML content message and send it as signed | C1878167 | C1823073', async() => {
		let boldMessage = 'bold' + utils.getUniqueString();
		let mailSubject = 'subject' + utils.getUniqueString();
		let toRecipients = config.user2;

		// Compose message
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN);
		await mail.enterMailSubject(mailSubject);
		await mail.enterHTMLbodyContent(option.O_BOLD, boldMessage);
		await mail.enterRecipient(textfield.T_TO, toRecipients);
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(toRecipients);
		await mail.isMessagePresent(mailSubject).should.eventually.equal(true);
		await mail.selectMessage(mailSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of signed message');
		let messageContent = await mail.getReadingPaneContent(true);
		await messageContent.should.contain('<b>' + boldMessage + '</b>', 'Verify bold string in signed message');
	});


	it('BHR | Compose HTML content message and send it as encrypted | C1878072', async() => {
		let boldMessage = 'bold' + utils.getUniqueString();
		let mailSubject = 'subject' + utils.getUniqueString();
		let toRecipients = config.user2;

		// Compose message
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN_AND_ENCRYPT);
		await mail.enterMailSubject(mailSubject);
		await mail.enterHTMLbodyContent(option.O_BOLD, boldMessage);
		await mail.enterRecipient(textfield.T_TO, toRecipients);
		await mail.clickSendbutton();

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(toRecipients);
		await mail.isMessagePresent(mailSubject).should.eventually.equal(true);
		await mail.selectMessage(mailSubject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of message');
		let messageContent = await mail.getReadingPaneContent(true);
		await messageContent.should.contain('<b>' + boldMessage + '</b>', 'Verify bold string in message');
	});


	it('BHR | Compose multi-line message and send it as signed | C1400227', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		messageObject.subject = 'subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;

		// Compose message
		await mail.composeAndSendMessage(messageObject, option.O_SIGN);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of signed message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify signed message body value');
	 });


	it('BHR | Compose mutli-line message and send it as encrypted | C1878071', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.body = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		messageObject.subject = 'subject ' + utils.getUniqueString(),
		messageObject.toRecipients = config.user2;

		// Compose message
		await mail.composeAndSendMessage(messageObject, option.O_SIGN_AND_ENCRYPT);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(messageObject.body	, 'Verify message body value');
	});
});