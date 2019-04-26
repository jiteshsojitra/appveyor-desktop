const app = require('../framework/app-config');
const option = require('../framework/elements/option');

module.exports = {
	locators: {
		settingsIcon: 'span.zimbra-client_header-actions_settingsIcon',
		settingsDialog: 'div.zimbra-client_settings-modal_inner',
		settingsSaveButton: "//button[.='Save']",
		smimeAndEncryption: 'a=S/MIME and Encryption',
		defaultSettingsList: '//ul[contains(@class,"zimbra-client_settings_list")]//li',
		certificateAccount: '//ul[contains(@class,"zimbra-client_settings_smimeCertificatesList")]//li//span[contains(@class,"zimbra-client_settings_certAccount")]',
		certificateViewLink: '//ul[contains(@class,"zimbra-client_settings_smimeCertificatesList")]//li//span[contains(@class,"zimbra-client_settings_viewCert")]',
		certificateFieldLocator: (Section,Item) => '//strong[contains(text(),"' + Section + '")]/following-sibling::div/div/div[text()="' + Item + '"]/following-sibling::div',
		issuedByLocator: '//strong[contains(text(),"Issued to")]/following-sibling::div',
		validityLocator: '//strong[contains(text(),"Period of Validity")]/following-sibling::div'
	},

	async openSettings() {
		await app.client.click(this.locators.settingsIcon).click('span=' + option.O_SETTINGS);
		await app.client.waitForExist(this.locators.settingsDialog);
	},

	async saveSettings() {
		await app.client.click(this.locators.settingsSaveButton);
	},

	async modifyDefaultSmimeSetting(value = option.O_DO_NOT_SIGN_OR_ENCRYPT) {
		await this.openSettings();
		await app.client.isExisting(this.locators.smimeAndEncryption).should.eventually.equal(true);
		await app.client.click(this.locators.smimeAndEncryption).pause(1000);
		await app.client.click(this.locators.defaultSettingsList + '//label[text()="' + value + '"]//input');
		await this.saveSettings();
	},

	async getCertificateAccountName() {
		await app.client.pause(2000);
		return await app.client.getText(this.locators.certificateAccount);
	},

	async getCertificateFieldDetail(section, fieldLabel) {
		return await app.client.getText(this.locators.certificateFieldLocator(section, fieldLabel));
	},
};