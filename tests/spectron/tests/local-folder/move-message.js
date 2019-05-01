const config = require('../../conf/config').getConfig();
const folder = require('../../pages/folder');
const mail = require('../../pages/mail');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const soap = require('../../framework/soap-client');
const path = require('path');

describe('Move local folder message', function() {
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
		await folder.removeAllLocalFolders();
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


	it('Application-Bug-SXmoke | Move multiple messages via top toolbar move button to local folder using message view | C1832588 | PREAPPS-1808', async() => {
		let senderAuthToken = await soap.getAccountAuthToken(config.user1);
		let mailsubject1 = `1subject${await utils.getUniqueString()}`;
		let mailsubject2 = `2subject${await utils.getUniqueString()}`;
		let mailbody = `body${await utils.getUniqueString()}`;
		let folderName = `folder${await utils.getUniqueString()}`;

		await soap.sendMessage(senderAuthToken, account.emailAddress, mailsubject1, mailbody);
		await soap.sendMessage(senderAuthToken, account.emailAddress, mailsubject2, mailbody);
		await folder.createLocalFolder(folderName);
		await utils.sleep(1000);

		await folder.moveMailToLocalFolder([mailsubject1, mailsubject2], folderName);
		await mail.getToastMessage().should.eventually.contain('2 messages moved to ' + folderName, 'Verify toast message for message move');
		await mail.selectFolder(folderName);
		(await mail.isMessagePresent(mailsubject1) && await mail.isMessagePresent(mailsubject2)).should.eql(true, 'Verify all messages have been moved to local folder');
		(await folder.numberOfMailFilesInLocalStorage(account.emailAddress, folderName)).should.eql(2, 'Verify email files have been generated in the system local storage folder');
		(await soap.searchAndGetMessage(account.authToken, mailsubject1, 'Inbox') === null).should.eql(true, 'Verify mail deos not exist in mail Inbox');
		(await soap.searchAndGetMessage(account.authToken, mailsubject2, 'Inbox') === null).should.eql(true, 'Verify mail deos not exist in mail Inbox');
	});


	it('BHR | Move multiple messages contains file attachments to local folder using message view | C2058412', async() => {
		let mailSubject1 = 'Single file attachment';
		let mailSubject2 = 'Inline image attachment';
		let fileName1 = 'single-file-attachment.txt';
		let fileName2 = 'inline-image-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName1);
		let folderName = `folder${await utils.getUniqueString()}`;

		await mail.injectMessage(account.emailAddress, filePath, mailSubject1);
		filePath = path.join(utils.baseDir, '/data/mimes/' + fileName2);
		await mail.injectMessage(account.emailAddress, filePath, mailSubject2);
		await folder.createLocalFolder(folderName);
		await common.reloadApp();

		await folder.moveMailToLocalFolder([mailSubject1, mailSubject2], folderName);
		await mail.getToastMessage().should.eventually.contain('2 messages moved to ' + folderName, 'Verify toast message for message move');
		await mail.selectFolder(folderName);
		(await mail.isMessagePresent(mailSubject1) && await mail.isMessagePresent(mailSubject2)).should.eql(true, 'Verify all messages have been moved to local folder');
		(await folder.numberOfMailFilesInLocalStorage(account.emailAddress, folderName)).should.eql(2, 'Verify email files have been generated in the system local storage folder');
		(await folder.numberOfAttachmentFoldersInLocalStorage(account.emailAddress, folderName)).should.eql(2, 'Verify attachment folders have been generated in the system local storage folder');
		(await soap.searchAndGetMessage(account.authToken, mailSubject1, 'Inbox') === null).should.eql(true, 'Verify mail deos not exist in mail Inbox');
		(await soap.searchAndGetMessage(account.authToken, mailSubject2, 'Inbox') === null).should.eql(true, 'Verify mail deos not exist in mail Inbox');
	});
});