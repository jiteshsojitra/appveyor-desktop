const option = require('../../../framework/elements/option');
const config = require('../../../conf/config').getConfig();
const settings = require('../../../pages/settings');
const utils = require('../../../framework/utils');
const common = require('../../../pages/common');
const mail = require('../../../pages/mail');

describe('Reply smime mail in message view', function() {
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


	it('Smoke | Reply signed message as signed using message view | C1963923', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user2, 'Verify smime status of message');
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it('BHR | Reply signed message as encrypted using message view | C1963924', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user2, 'Verify smime status of message');
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it.skip('Functional | Reply encrypted message as normal using message view | C1963925 | PREAPPS-2359', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it('Functional | Reply encrypted message as signed using message view | C1826034', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user2, 'Verify smime status of message');
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it('Smoke | Reply encrypted message as encrypted using message view | C1963926', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN_AND_ENCRYPT, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as encrypted
		await settings.modifyDefaultSmimeSetting(option.O_SIGN_AND_ENCRYPT);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user2, 'Verify smime status of message');
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it('Functional | Reply normal message as normal using message view | C1650996', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();
		await mail.sendMessageUsingSoap(config.user2, config.user1, messageObject.subject, messageObject.body);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it('BHR | Reply normal message as signed using message view | C1823076', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();
		await mail.sendMessageUsingSoap(config.user2, config.user1, messageObject.subject, messageObject.body);

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN;
		replyMessage.body = 'reply' + utils.getUniqueString();
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed by ' + config.user1, 'Verify smime status of message');
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it('BHR | Reply normal message as encrypted using message view | C1823077', async() => {
		let messageObject = Object.create(mail.message);
		messageObject.subject = 'subject' + utils.getUniqueString();
		messageObject.body = 'body' + utils.getUniqueString();
		await mail.sendMessageUsingSoap(config.user2, config.user1, messageObject.subject, messageObject.body);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_SIGN_AND_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as normal
		await settings.modifyDefaultSmimeSetting(option.O_DO_NOT_SIGN_OR_ENCRYPT);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user2);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await mail.getSmimeStatusFromReadingPane().should.eventually.contain('Signed and Encrypted by ' + config.user1, 'Verify smime status of message');
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});


	it.skip('Functional | Reply signed message as normal using message view | C1650985 | PREAPPS-2359', async() => {
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user2);
		await common.logoutFromClient();
		await common.loginToClient(config.user2);

		// Reply message
		let replyMessage = Object.create(mail.message);
		replyMessage.subject = messageObject.subject;
		replyMessage.messageType = option.O_DO_NOT_SIGN_OR_ENCRYPT;
		replyMessage.body = 'reply' + utils.getUniqueString();

		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.replyMessageUsingMessageView(replyMessage);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(config.user1);
		await mail.isMessagePresent('Re: ' + messageObject.subject).should.eventually.equal(true, 'Verify message is present');
		await mail.selectMessage('Re: ' + messageObject.subject);
		await (await mail.getReadingPaneContent()).should.contains(replyMessage.body, 'Verify replied message contains correct mail body');
	});
});