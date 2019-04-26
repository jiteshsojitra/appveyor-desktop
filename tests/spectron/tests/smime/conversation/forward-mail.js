const option = require('../../../framework/elements/option');
const folder = require('../../../framework/elements/folder');
const config = require('../../../conf/config').getConfig();
const settings = require('../../../pages/settings');
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const mail = require('../../../pages/mail');

describe('Forward smime mail in conversation view', function() {
	this.timeout(0);

	async function beforeEachTest() {
		await mail.setConversationView(config.user1);
		await mail.setConversationView(config.user3);
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


	it('Smoke | Forward encrypted message as encrypted using conversation view | C1910993', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body	, 'Verify message body value');
	});


	it('BHR | Forward signed message as encrypted using conversation view | C1910991', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body	, 'Verify message body value');
	});


	it('Functional | Forward normal message as encrypted using conversation view | C1823087', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();
		messageObject.toRecipients = config.user1;

		// Add normal message
		await mail.sendMessageUsingSoap(config.user2, config.user1, messageObject.subject, messageObject.body);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Verify that the message is added into the mailbox
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present');

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'body' + utils.getUniqueString();
		await mail.forwardMessage(forwardMessage);

		// Verify that the message is present in Sent folder
		await mail.selectFolder(folder.F_SENT);
		await mail.isMessagePresent('Fwd: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present in sent folder');

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + messageObject.toRecipients, 'Verify smime status of message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value');
	});
});