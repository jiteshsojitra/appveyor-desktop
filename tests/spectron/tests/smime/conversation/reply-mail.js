const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const settings = require('../../../pages/settings');
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const mail = require('../../../pages/mail');

describe('Reply smime mail in conversation view', function() {
	this.timeout(0);

	async function beforeEachTest() {
		await mail.setConversationView(config.user2);
		await mail.setConversationView(config.user3);
		await common.loginBeforeTestRun(config.user2);
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


	it('BHR | Reply signed message as signed using conversation view | C1924365', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user3);
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply signed message as normal using conversation view | C1924364', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user3);
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply signed message as encrypted using conversation view | C1650987', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user3);
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply encrypted message as normal using conversation view | C1650991', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user3);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.verifySmimeStatusPresentInReadingPane().should.eventually.equal(false, 'Verify smime status present in message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply encrypted message as signed using conversation view | C1826036', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user3);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('Smoke | Reply encrypted message as encrypted using conversation view | C1924366', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user3);
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
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body, 'Verify message body value');
	});


	it('BHR | Reply normal message as signed using conversation view | C1823082', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();
		messageObject.toRecipients = config.user2;

		// Add normal message
		await mail.sendMessageUsingSoap(config.user3, messageObject.toRecipients, messageObject.subject, messageObject.body);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Verify that the message is added into the mailbox
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body	, 'Verify message body value');
	});


	it('BHR | Reply normal message as encrypted using conversation view | C1823083', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();
		messageObject.toRecipients = config.user2;

		// Add normal message
		await mail.sendMessageUsingSoap(config.user3, messageObject.toRecipients, messageObject.subject, messageObject.body);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'body' + utils.getUniqueString();
		await mail.replyMessage(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(replyMessage.body	, 'Verify message body value');
	});
});