const config = require('../../conf/config').getConfig();
const contacts = require('../../pages/contacts');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const button = require('../../framework/elements/button');
const folderlabel = require('../../framework/elements/folder');
const soap = require('../../framework/soap-client');

describe('Delete contact', function() {
	this.timeout(0);
	let account = {};

	async function beforeEachTest() {
		account = await common.createAccount();
		await common.loginBeforeTestRun(account.emailAddress);
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


	it('Smoke | Delete basic contact using top toolbar button | C543070', async() => {
		let parentFolderId = await soap.getFolder(account.authToken, folderlabel.F_CONTACTS, folderlabel.F_CONTACTS_FOLDER_TYPE);
		let firstName = `first${await utils.getUniqueString()}`;
		let lastName = `last${await utils.getUniqueString()}`;
		let fullName = `${firstName} ${lastName}`;
		let emailAddress = `email@${config.testDomain}`;

		// Create contact
		await soap.createContact(account.authToken, parentFolderId, firstName, lastName, emailAddress);
		await common.navigateApp(button.B_CONTACT_APP);
		await contacts.selectContactByName(fullName);

		// Delete contact
		await contacts.removeContact(fullName);
		await utils.waitUntilDisappear(contacts.locators.contactSelector(fullName));
		(await contacts.isContactPresentWithName(fullName)).should.eql(false, 'Verify contact has been removed.');
	});


	it('Functional | Delete basic contacts using checkbox selection and top toolbar button | C543072', async() => {
		let firstName1 = `first1${await utils.getUniqueString()}`;
		let firstName2 = `first2${await utils.getUniqueString()}`;
		let lastName1 = `last1${await utils.getUniqueString()}`;
		let lastName2 = `last2${await utils.getUniqueString()}`;
		let emailAddress1 = `email1@${config.testDomain}`;
		let emailAddress2 = `email2@${config.testDomain}`;
		let fullName1 = `${firstName1} ${lastName1}`;
		let fullName2 = `${firstName2} ${lastName2}`;
		let parentFolderId = await soap.getFolder(account.authToken, folderlabel.F_CONTACTS, folderlabel.F_CONTACTS_FOLDER_TYPE);

		// Create contacts
		await soap.createContact(account.authToken, parentFolderId, firstName1, lastName1, emailAddress1);
		await soap.createContact(account.authToken, parentFolderId, firstName2, lastName2, emailAddress2);

		// Delete contacts
		await common.navigateApp(button.B_CONTACT_APP);
		await contacts.deleteAllContactsFromActionBar();
		await utils.waitUntilDisappear(contacts.locators.contactSelector(fullName1));
		(await contacts.isContactPresentWithName(fullName1)).should.eql(false, 'Verify contact1 has been removed');
		(await contacts.isContactPresentWithName(fullName2)).should.eql(false, 'Verify contact2 has been removed');

		let readingPaneMessage = 'Choose a contact to view or update.';
		(await contacts.getReadingPaneText()).should.contain(readingPaneMessage, 'Verify that contact read pane displays correct message');
		await contacts.clickSideBarContactItem(button.B_DELETED_CONTACTS);
		(await contacts.isContactPresentWithName(fullName1)).should.eql(true, 'Verify contact1 is moved to Deleted Contacts');
		(await contacts.isContactPresentWithName(fullName2)).should.eql(true, 'Verify contact2 is moved to Deleted Contacts');
	});
});