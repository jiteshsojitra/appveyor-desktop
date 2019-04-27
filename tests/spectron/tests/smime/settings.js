const app = require('../../framework/app-config');
const config = require('../../conf/config').getConfig();
const settings = require('../../pages/settings');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const button = require('../../framework/elements/button');
const option = require('../../framework/elements/option');
const textfield = require('../../framework/elements/textfield');
const mail = require('../../pages/mail');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.should();
chai.use(chaiAsPromised);

describe('Smime settings', function() {
	this.timeout(0);

	async function beforeEachTest() {
		await common.loginBeforeTestRun(config.user1);
	}

	before(async() => {
		await common.startApplication();
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


	it('Smoke | Check whether SMIME option enabled and certificate present in settings | C1936507', async() => {
		await settings.openSettings();
		await app.client.isExisting(settings.locators.smimeAndEncryption).should.eventually.equal(true,'Verify Smime is enabled');
		await app.client.click(settings.locators.smimeAndEncryption).pause(1000);
		await settings.getCertificateAccountName().should.eventually.contains(config.user1, 'Verify certificate is present');
		await utils.pressButton(button.B_CANCEL);
	});


	it('BHR | View certificate details in settings dialog | C1823075', async() => {
		let certificateValidityBeginsOn, certificateValidityEndsOn, certificateSerialNumber, certificateIssuedTo, certificateIssuedBy;
		if (process.env.TEST_SUITE === 'BHR') {
			certificateIssuedTo = 'Zimbra';
			certificateIssuedBy = 'Zimbra';
			certificateValidityBeginsOn = 'April 16, 2019';
			certificateValidityEndsOn = 'April 15, 2020';
			certificateSerialNumber = '10 00 07';
		} else if (process.env.TEST_SUITE === 'Full') {
			certificateIssuedTo = 'SYNACOR';
			certificateIssuedBy = 'Zimbra';
			certificateValidityBeginsOn = 'April 22, 2019';
			certificateValidityEndsOn = 'April 21, 2020';
			certificateSerialNumber = '10 00 13';
		} else {
			throw "TEST_SUITE must be set as an environment variable with valid certificate details to run this testcase!";
		}

		await settings.openSettings();
		await app.client.isExisting(settings.locators.smimeAndEncryption).should.eventually.equal(true);
		await app.client.click(settings.locators.smimeAndEncryption).pause(1000);
		await settings.getCertificateAccountName().should.eventually.contains(config.user1, 'Verify certificate is present');
		await app.client.click(settings.locators.certificateViewLink);
		await settings.getCertificateFieldDetail(textfield.T_ISSUED_TO, textfield.T_EMAIL).should.eventually.contains(config.user1, 'Verify issued to email');
		await settings.getCertificateFieldDetail(textfield.T_ISSUED_TO, textfield.T_ORGANIZATION).should.eventually.contains(certificateIssuedTo, 'Verify issued to organization');
		await settings.getCertificateFieldDetail(textfield.T_ISSUED_BY, textfield.T_ORGANIZATION).should.eventually.contains(certificateIssuedBy, 'Verify issued by organization');
		await settings.getCertificateFieldDetail(textfield.T_PERIOD_OF_VALIDITY, textfield.T_BEGINS_ON).should.eventually.contains(certificateValidityBeginsOn, 'Verify period of validity begins on');
		await settings.getCertificateFieldDetail(textfield.T_PERIOD_OF_VALIDITY, textfield.T_ENDS_ON).should.eventually.contains(certificateValidityEndsOn, 'Verify period of validity ends on');
		await settings.getCertificateFieldDetail(textfield.T_SIGNATURE, textfield.T_SERIAL_NUMBER).should.eventually.contains(certificateSerialNumber, 'Verify Signature serial number');
	});


	it('Functional | Set sign default operation and verify in composing a mail | C1936508', async() => {
		// Modify default smime setting as signed
		await settings.modifyDefaultSmimeSetting(option.O_SIGN);
		await mail.clickNewMessageButton();
		await mail.getComposeMailSmimeOperation().should.eventually.contains('Sign', 'Verify smime operation selected while composing a mail');
	});
});