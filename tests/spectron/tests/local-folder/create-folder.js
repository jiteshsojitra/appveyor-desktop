const folder = require('../../pages/folder');
const folderLabel = require('../../framework/elements/folder');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const app = require('../../framework/app-config');

describe('Create local folder', function() {
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


	it('Smoke | Create local folder | C1832582', async() => {
		let folderName = `folder${await utils.getUniqueString()}`;

		// Create local folder
		await folder.createLocalFolder(folderName);
		(await app.client.isExisting(folder.locators.folderItem(folderName))).should.eql(true, 'Verify folder appears in the folder group');
		(await folder.isFolderExistInLocalStorage(account.emailAddress, folderName)).should.eql(true, 'Verify local folder has been created');
		await app.client.moveToObject(folder.locators.folderGroup(folderLabel.F_LOCAL_FOLDERS));
		(await app.client.isExisting(`(${folder.locators.folderGroup(folderLabel.F_LOCAL_FOLDERS)}//span)[2]`)).should.eql(false, 'Verify "+" to add a local folder no longer shows');

		// Verify local folder after logout
		await common.logoutFromClient();
		await common.loginToClient(account.emailAddress);
		(await folder.isFolderExistInLocalStorage(account.emailAddress, folderName)).should.eql(true, 'Verify local folder persistence across app restart');
	});
});