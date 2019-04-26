const folder = require('../../pages/folder');
const mail = require('../../pages/mail');
const folderLable = require('../../framework/elements/folder');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const soap = require('../../framework/soap-client');
const app = require('../../framework/app-config');
const path = require('path');

describe('Delete local folder', function() {
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


	it('Smoke | Delete empty local folder | C1902671', async() => {
		let folderName = `folder${await utils.getUniqueString()}`;

		await folder.createLocalFolder(folderName);
		await utils.sleep(2000);
		await folder.deleteFolder(folderName, false);
		(await app.client.isExisting(folder.locators.folderItem(folderName))).should.eql(false, 'Verify folder has been removed');
		(await folder.isFolderExistInLocalStorage(account.emailAddress, folderName)).should.eql(false, 'Verify folder does not exist in system local storage');
	});


	it('BHR | Delete local folder contains mail | C1902672', async() => {
		let mimeMessageSubject = 'Single file attachment';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);
		let folderName = `folder${await utils.getUniqueString()}`;

		await mail.injectMessage(account.emailAddress, filePath, mimeMessageSubject);
		await folder.createLocalFolder(folderName);
		await common.reloadApp();

		await folder.moveMailToLocalFolder(mimeMessageSubject, folderName);
		await mail.selectFolder(folderName);
		(await mail.isMessagePresent(mimeMessageSubject)).should.eql(true, 'Verify C1832587: Move Single message via Header toolbar Move button, Message View');
		(await soap.searchAndGetMessage(mimeMessageSubject, mimeMessageSubject, folderLable.F_INBOX) === null).should.eql(true, 'Verify mail deos not exist in mail Inbox');
		await folder.deleteFolder(folderName);
		await mail.getToastMessage().should.eventually.contain('Only empty folders can be deleted', 'Verify toast message contact created');
		(await app.client.isExisting(folder.locators.folderItem(folderName))).should.eql(true, 'Verify folder still exist');
		(await folder.isFolderExistInLocalStorage(account.emailAddress, folderName)).should.eql(true, 'Verify folder exist in system local storage');
	});
});