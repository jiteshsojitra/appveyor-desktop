const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const settings = require('../../../pages/settings');
const mail = require('../../../pages/mail');

describe('Forward smime mail in message view', function() {
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


	it('Smoke | Forward encrypted message as encrypted using message view | C1990345', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2);
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
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value');
	});


	it('BHR | Forward signed message as encrypted using message view | C1990344', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2);
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
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value');
	});


	it('Functional | Forward normal message as encrypted using message view | C1990343', async() => {
		let messageObject = await mail.sendMessage(option.O_DO_NOT_SIGN_OR_ENCRYPT, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(messageObject.toRecipients);

		// Forward message
		let forwardMessage = Object.create(mail.message);
		forwardMessage.toRecipients = config.user3;
		forwardMessage.subject = messageObject.subject;
		forwardMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		forwardMessage.body = 'forward' + utils.getUniqueString();

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);
		await mail.forwardMessage(forwardMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user3);
		await mail.selectMessage('Fwd: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contains('Signed and Encrypted', 'Verify smime status displayed in message');
		await mail.getReadingPaneContent().should.eventually.contain(forwardMessage.body, 'Verify message body value');
	});
});