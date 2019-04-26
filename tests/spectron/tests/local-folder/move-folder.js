const folder = require('../../pages/folder');
const folderLabel = require('../../framework/elements/folder');
const mail = require('../../pages/mail');
const menu = require('../../framework/elements/menu');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const soap = require('../../framework/soap-client');
const path = require('path');
const app = require('../../framework/app-config');

describe('Move local folder', function() {
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


	it('Smoke | Move user folder to local folders contains messages with no sub-folder | C1901997', async() => {
		let mailSubject = 'Single file attachment';
		let fileName = 'single-file-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName);
		let mailFolder = `mail${await utils.getUniqueString()}`;

		await soap.createFolder(account.authToken, mailFolder, folder.F_MAIL_FOLDER_MESSAGE_VIEW);
		await mail.injectMessage(account.emailAddress, filePath, mailSubject, mailFolder);
		await common.reloadApp();

		await folder.moveFolderToLocalFolder(mailFolder);
		await utils.waitUntilDisappear(folder.locators.folderGroup(folderLabel.F_FOLDERS) + '//parent::div//a[@title="' + mailFolder + '"]');
		(await folder.isFolderExistInGroupFolder(account.authToken, folderLabel.F_FOLDERS, mailFolder)).should.eql(false, 'Verify that folder deos not exist in folder group');
		await mail.selectFolder(mailFolder);
		(await mail.isMessagePresent(mailSubject)).should.eql(true, 'Verify mail exists in moved local folder');
		(await folder.isFolderExistInLocalStorage(account.emailAddress, mailFolder)).should.eql(true, 'Verify local folder created');
		(await folder.numberOfMailFilesInLocalStorage(account.emailAddress, mailFolder)).should.eql(1, 'Verify mail file exist in folder storage folder');
	});


	it('BHR | Move user folder to local folders contains messages with sub-folder | C1902000', async() => {
		let mailFolder = `folder${await utils.getUniqueString()}`;
		let subMailFolder = `subfolder${await utils.getUniqueString()}`;
		let mailSubject1 = 'JPG file attachment';
		let mailSubject2 = 'Inline image attachment';
		let fileName1 = 'jpg-file-attachment.txt';
		let fileName2 = 'inline-image-attachment.txt';
		let filePath = path.join(utils.baseDir, '/data/mimes/' + fileName1);

		const folderId = await soap.createFolder(account.authToken, mailFolder, folderLabel.F_MAIL_FOLDER_MESSAGE_VIEW);
		await soap.createFolder(account.authToken, subMailFolder, folder.F_MAIL_FOLDER_MESSAGE_VIEW, folderId);
		await soap.injectMime(account.authToken, filePath, mailFolder);
		filePath = path.join(utils.baseDir, '/data/mimes/' + fileName2);
		await soap.injectMime(account.authToken, filePath, mailFolder + '/' + subMailFolder);
		await common.reloadApp();

		await folder.moveFolderToLocalFolder(mailFolder);
		await mail.selectFolder(mailFolder);
		(await folder.isFolderExistInGroupFolder(account.authToken, folderLabel.F_FOLDERS, mailFolder)).should.eql(true, 'Verify that folder deos not exist in folder group');
		(await mail.isMessagePresent(mailSubject1)).should.eql(false, 'Verify mail in mail folder does not exist');
		await folder.unCollapseFolder(mailFolder, subMailFolder);
		await mail.selectFolder(subMailFolder);
		(await mail.isMessagePresent(mailSubject2)).should.eql(true, 'Verify mail exist in subfolder');

		await app.client.click(`(${folder.locators.folderItem(mailFolder)})[2]`);
		(await mail.isMessagePresent(mailSubject1)).should.eql(true, 'Verify mail exists in moved local folder');
		(await folder.isFolderExistInLocalStorage(account.emailAddress, mailFolder)).should.eql(true, 'Verify local folder created');
		(await folder.numberOfMailFilesInLocalStorage(account.emailAddress, mailFolder)).should.eql(1, 'Verify mail file exist in folder storage folder');
	});


	it('Functional | Move user folder to local folders with local folder already exists | C1901998', async() => {
		let mailFolder = `mailfolder${await utils.getUniqueString()}`;
		let localFolderName = `localFolder${await utils.getUniqueString()}`;

		await soap.createFolder(account.authToken, mailFolder, folderLabel.F_MAIL_FOLDER_MESSAGE_VIEW);
		await folder.removeLocalStorage(account.emailAddress);
		await common.reloadApp();
		await folder.createLocalFolder(localFolderName);

		await folder.selectFolderContextMenu(mailFolder, menu.M_MOVE_FOLDER);
		await folder.searchFolderFromMenuContext(folderLabel.F_LOCAL_FOLDERS);
		(String(await app.client.getAttribute(folder.locators.folderContextMenuItem(folderLabel.F_LOCAL_FOLDERS), 'class')).should.contain('item_disabled'), 'Verify local folders is disabled');
	});
});