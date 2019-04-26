 const button = require('../../framework/elements/button');
const contacts = require('../../pages/contacts');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const app = require('../../framework/app-config');

describe('Create contact list', function() {
	this.timeout(0);
	let account = {};

	async function beforeEachTest() {
		account = await common.createAccount();
		await common.loginBeforeTestRun(account.emailAddress);
		await common.navigateApp(button.B_CONTACT_APP);
	}

	before(async () => {
		try {
			await common.startApplication();
			utils.configChai();
		} catch (error) {
			console.log(error); // eslint-disable-line
			throw new Error('Error occurred when starting application');
		}
	});
	after(async () => {
		try {
			await common.stopApplication();
		} catch (error) {
			console.log(error); // eslint-disable-line
			throw new Error('Error occurred when closing application');
		}
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


	it('Smoke | Create basic contact list | C432965', async () => {
		let contactList = `list${await utils.getUniqueString()}`;
		await contacts.createContactList(contactList);
		(await app.client.isExisting(contacts.locators.sidebarContactItem(contactList))).should.eql(true, 'Verify contact list has been created');
	});
});