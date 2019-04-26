const config = require('../../conf/config').getConfig();
const contacts = require('../../pages/contacts');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const button = require('../../framework/elements/button');
const textfield = require('../../framework/elements/textfield');

describe('Create contact', function() {
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


	it('Smoke | Create basic contact | C679288', async() => {
		let firstName = 'first' + await utils.getUniqueString();
		let lastName = 'last' + await utils.getUniqueString();
		let fullName = firstName + ' ' + lastName;
		let email = `email@${config.testDomain}`;

		// Create contact
		await contacts.createBasicContact(firstName, lastName, email);

		// Verify contact
		let contactDetails = await contacts.getContactCardDetails(fullName);
		contactDetails.should.contain(fullName, 'Verify contact full name');
		contactDetails.should.contain(email, 'Verify contact email address');
	});


	it('Functional | Create basic contact with all fields | C432586', async() => {
		let firstName = 'first' + await utils.getUniqueString();
		let middleName = 'middle' + await utils.getUniqueString();
		let lastName = 'last' + await utils.getUniqueString();
		let fullName = `${firstName} ${middleName} ${lastName}`;
		let email = `email@${config.testDomain}`;
		let phone = '1231231234';
		let jobTitle = 'engineer';
		let company = 'synacor';
		let birthday = '01/01/1991';
		let anniversary = '02/02/1992';
		let website = 'http://www.synacor.com';
		let notes = 'notes' + await utils.getUniqueString();

		// Create contact
		await contacts.openNewContact();
		await contacts.typeContactDetail(textfield.T_FIRST_NAME, firstName);
		await contacts.typeContactDetail(textfield.T_MIDDLE_NAME, middleName);
		await contacts.typeContactDetail(textfield.T_LAST_NAME, lastName);
		await contacts.typeContactDetail(textfield.T_EMAIL_NAME, email);
		await contacts.typeContactDetail(textfield.T_PHONE, phone);
		await contacts.typeContactDetail(textfield.T_JOB_TITLE, jobTitle);
		await contacts.typeContactDetail(textfield.T_COMPANY, company);
		await contacts.typeContactDetail(textfield.T_BIRTHDAY, birthday);
		await contacts.typeContactDetail(textfield.T_ANNIVERSARY, anniversary);
		await contacts.typeContactDetail(textfield.T_WEBSITE, website);
		await contacts.typeContactDetail(textfield.T_NOTES, notes);
		await contacts.saveContact();

		// Verify contact
		let contactDetails = await contacts.getContactCardDetails(fullName);
		contactDetails.should.contain(fullName, 'Verify full name');
		contactDetails.should.contain(email, 'Verify email address');
		contactDetails.should.contain(phone, 'Verify phone number');
		contactDetails.should.contain(jobTitle, 'Verify job title');
		contactDetails.should.contain(company, 'Verify company name');
		contactDetails.should.contain('January 1, 1991', 'Verify birthday');
		contactDetails.should.contain('February 2, 1992', 'Verify anniversary');
		contactDetails.should.contain(website, 'Verify website');
		contactDetails.should.contain(notes, 'Verify notes');
	});
});