const config = require('../../conf/config').getConfig();
const contacts = require('../../pages/contacts');
const mail = require('../../pages/mail');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const button = require('../../framework/elements/button');
const option = require('../../framework/elements/option');
const folder = require('../../framework/elements/folder');
const textfield = require('../../framework/elements/textfield');
const app = require('../../framework/app-config');
const path = require('path');

describe('Create smime contact', function() {
	this.timeout(0);

	async function beforeEachTest() {
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


	it('Smoke | Creat contact and upload public certificate | C1423715', async() => {
		let firstName = `first${await utils.getUniqueString()}`;
		let lastName = `last${await utils.getUniqueString()}`;
		let contactDisplayName = `${firstName} ${lastName}`;
		let certificateUser = 'smokeuser2';
		let certificateFile = path.join(utils.baseDir, '/data/certs/' + certificateUser + '.cer');

		// Create contact
		await contacts.createContactWithSoap(config.user1, firstName, lastName, `${certificateUser}@${config.testDomain}`);
		await common.navigateApp(button.B_CONTACT_APP);
		await contacts.selectContactByName(contactDisplayName);
		await contacts.clickToobBarButton(button.B_EDIT_DETAILS);
		await contacts.uploadPublicCertificate(certificateFile);
		await contacts.saveContact();

		// Verify uploaded certificate
		let contactDetails = await contacts.getContactCardDetails(contactDisplayName);
		contactDetails.should.contain('Security Certificate', 'Verify label appears');
		contactDetails.should.contain('Certificate verified', 'Verify certificate status appears');
		contactDetails.should.contain('View Certificate', 'Verify view certificate link appears');
	});


	it('BHR | Add contact from received signed message | C1982294', async () => {
		// Send signed message
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user4);
		await common.logoutFromClient();
		await common.loginToClient(config.user4);
		await contacts.deleteContactIfPresent(config.user1);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeContactStatus().should.eventually.contain(config.user1.split('@')[0] + ' not found in Contacts', 'Verify SMIME contact status appears');
		await mail.createContactFromSmimeStatus();
		await mail.getToastMessage().should.eventually.contain('Contact created', 'Verify toast message contact created');

		// Verify uploaded certificate
		await common.navigateApp(button.B_CONTACT_APP);
		let contactDetails = await contacts.getContactCardDetails(config.user1.split('@')[0]);
		contactDetails.should.contain('Security Certificate', 'Verify label appears');
		contactDetails.should.contain('Certificate verified', 'Verify certificate status appears');
		contactDetails.should.contain('View Certificate', 'Verify view certificate link appears');
	});


	it('BHR | Add certificate to contact from received signed message | C1982295', async () => {
		// Send signed message
		let firstName = `first${await utils.getUniqueString()}`;
		let lastName = `last${await utils.getUniqueString()}`;
		let contactDisplayName = `${firstName} ${lastName}`;
		let messageObject = await mail.sendMessage(option.O_SIGN, config.user5);
		await common.logoutFromClient();
		await common.loginToClient(config.user5);

		// Create contact and select smime message
		await contacts.createContactWithSoap(config.user5, firstName, lastName, config.user1);

		await common.navigateApp(button.B_MAIL_APP);
		await mail.selectMessage(messageObject.subject);
		await mail.getSmimeContactStatus().should.eventually.contain(`Add certificate to sender's contact information`, 'Verify SMIME contact status appears');
		await mail.addSenderPublicCertiFromSmimeStatus();
		await mail.getToastMessage().should.eventually.contain('Certificate added', 'Verify toast message contact created');

		// Verify uploaded certificate
		await common.navigateApp(button.B_CONTACT_APP);
		let contactDetails = await contacts.getContactCardDetails(contactDisplayName);
		contactDetails.should.contain('Security Certificate', 'Verify label appears');
		contactDetails.should.contain('Certificate verified', 'Verify certificate status appears');
		contactDetails.should.contain('View Certificate', 'Verify view certificate link appears');
	});


	it('Functional | Send encrypted message without public certificate of receiver and send as normal message | C1410544', async () => {
		let messageBody = 'Line 1' + utils.getUniqueString() + '\nLine 2' + utils.getUniqueString() + '\nLine 3' + utils.getUniqueString();
		let messageSubject = 'subject ' + utils.getUniqueString();
		let toRecipients = config.user5;

		// Compose message with smime
		await mail.clickNewMessageButton();
		await mail.selectSMIMEType(option.O_SIGN_AND_ENCRYPT);
		await mail.enterPlainTextBodyContent(messageBody);
		await mail.enterMailSubject(messageSubject);
		await mail.enterRecipient(textfield.T_TO, toRecipients);
		await app.client.waitForEnabled(mail.locators.sendButton, utils.elementExistTimeout);
		await app.client.click(mail.locators.sendButton);
		await mail.isWarningDialogAppear().should.eventually.equal(true, 'Verify presence of missing certificate dialog');
		await utils.pressButton(button.B_OK);

		// Verify draft message
		await mail.selectFolder(folder.F_DRAFTS);
		await mail.isMessagePresent(messageSubject).should.eventually.equal(true, 'Verify draft message present');
	});
});