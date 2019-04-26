const soap = require('../framework/soap-client');
const folder = require('../framework/elements/folder');
const textfield = require('../framework/elements/textfield');
const app = require('../framework/app-config');
const utils = require('../framework/utils');
const button = require('../framework/elements/button');
const common = require('../pages/common');

module.exports = {

	locators: {
		contactsReadPane: 'div.zimbra-client_contacts_readPane',
		contactSelector: (name) => '//div[@class="zimbra-client_smart-list_inner"]//h4[.=" ' + name + ' "]',
		contactEmailSelector: (email) => '//div[@class="zimbra-client_smart-list_inner"]//h5[.="' + email + '"]',
		toolbarButtonSelector: (buttonName) => '//div[@class="zimbra-client_contacts_toolbar"]//span[text()="' + buttonName + '"]',
		addCertificateLink: '//label[text()="Add a Certificate"]',
		saveButton: '//div[@class="zimbra-client_contacts_footer"]//button[text()="Save"]',
		contactCardDetais: '//div[@class="zimbra-client_contacts_card"]',
		selectAllCheckbox: 'div.zimbra-client_contacts_sort input[type="checkbox"]',
		contactList: '//div[contains(@class,"zimbra-client_smart-list_inner")]//li',
		deleteAllContacts: '//button[text()="Delete Contacts"]',
		sidebarContactItem: (itemText) => '//div[@class="zimbra-client_sidebar"]//a[.="' + itemText + '"]',
		contactInputField: (inputName) => '//div[@class="zimbra-client_contacts_readPane"]//input[@name="' + inputName + '"]',
		contactNotesInput: '//div[@class="zimbra-client_contacts_readPane"]//textarea[@name="notes"]',
		sidebarInputField: '//div[@class="zimbra-client_sidebar"]//input'
	},

	async createContactWithSoap(loggedUserEmail, firstName, lastName, emailAddress) {
		let accountAuthToken = await soap.getAccountAuthToken(loggedUserEmail);
		const parentFolderId = await soap.getFolder(accountAuthToken, folder.F_CONTACTS, folder.F_CONTACTS_FOLDER_TYPE);
		await soap.createContact(accountAuthToken, parentFolderId, firstName, lastName, emailAddress);
	},

	async createContactWithCertificate(loggedUserEmail, firstName, lastName, emailAddress, certificate) {
		let accountAuthToken = await soap.getAccountAuthToken(loggedUserEmail);
		const parentFolderId = await soap.getFolder(accountAuthToken, folder.F_CONTACTS, folder.F_CONTACTS_FOLDER_TYPE);
		await soap.createContactWithCertificate(accountAuthToken, parentFolderId, firstName, lastName, emailAddress, certificate);
	},

	// Upload file
	async uploadFile(filePath) {
		await app.client.waitForExist('input[type="file"]', utils.elementExistTimeout);
		await app.client.chooseFile('input[type="file"]', filePath);
	},

	async uploadPublicCertificate(path) {
		await app.client.click(this.locators.addCertificateLink);
		await this.uploadFile(path);
	},

	async selectContactByName(name) {
		await app.client.waitForExist(this.locators.contactSelector(name));
		await app.client.click(this.locators.contactSelector(name));
		await app.client.pause(1000);
	},

	async selectContactByEmail(email) {
		await app.client.pause(2000);
		await app.client.click(this.locators.contactEmailSelector(email));
	},

	async clickToobBarButton(buttonName) {
		await app.client.click(this.locators.toolbarButtonSelector(buttonName));
	},

	async saveContact() {
		await app.client.pause(1000);
		await app.client.click(this.locators.saveButton);
		await app.client.pause(3000);
	},

	async getContactCardDetails(name) {
		await this.clickSideBarContactItem(button.B_CONTACTS);
		await this.selectContactByName(name);
		return await app.client.getHTML(this.locators.contactCardDetais);
	},

	async isContactPresentWithName(name) {
		return await app.client.isExisting(this.locators.contactSelector(name));
	},

	async isContactPresentWithEmail(email) {
		let isPresent = await app.client.isExisting(this.locators.contactEmailSelector(email));
		return isPresent;
	},

	async deleteContactIfPresent(email) {
		await common.navigateApp(button.B_CONTACT_APP);
		await app.client.pause(3000);
		await this.removeContact(email);
		await common.navigateApp(button.B_MAIL_APP);
		await app.client.pause(2000);
	},

	async removeContact(emailOrName) {
		if (emailOrName.includes('@')) {
			if (await this.isContactPresentWithEmail(emailOrName)) {
				await this.selectContactByEmail(emailOrName);
			}
		} else {
			await this.selectContactByName(emailOrName);
		}
		await this.clickToobBarButton(button.B_DELETE);
	},

	async deleteAllContacts() {
		await common.navigateApp(button.B_CONTACT_APP);
		await app.client.pause(3000);
		await this.deleteAllContactsFromActionBar();
		await common.navigateApp(button.B_MAIL_APP);
	},

	async clickSideBarContactItem(itemText) {
		await app.client.waitForExist(this.locators.sidebarContactItem(itemText));
		await app.client.click(this.locators.sidebarContactItem(itemText));
		await app.client.pause(3000);
	},

	async openNewContact() {
		await this.clickSideBarContactItem(button.B_NEW_CONTACT);
		await app.client.waitForExist(this.locators.contactInputField(textfield.T_FIRST_NAME));
	},

	async createBasicContact(firstName, lastName, email) {
		await this.openNewContact();
		await this.typeContactDetail(textfield.T_FIRST_NAME, firstName);
		await this.typeContactDetail(textfield.T_LAST_NAME, lastName);
		await this.typeContactDetail(textfield.T_EMAIL_NAME, email);
		await this.saveContact();
		await app.client.waitForExist(this.locators.contactSelector(firstName + ' ' + lastName));
	},

	async typeContactDetail(inputFieldName, enteredText) {
		if (inputFieldName === textfield.T_NOTES) {
			await app.client.setValue(this.locators.contactNotesInput, enteredText);
		} else {
			await app.client.setValue(this.locators.contactInputField(inputFieldName), enteredText);
		}
	},

	async createContactList(listName) {
		await app.client.setValue(this.locators.sidebarInputField, listName);
		await app.client.pause(500);
		await app.client.keys('Enter');
		await app.client.pause(1000);
	},

	async deleteAllContactsFromActionBar(){
		await utils.sleep(2000);
		await app.client.click(this.locators.selectAllCheckbox);
		if (await app.client.isExisting(this.locators.deleteAllContacts)) {
			await app.client.click(this.locators.deleteAllContacts);
		}
		if (await app.client.isExisting(this.locators.toolbarButtonSelector(button.B_DELETE))) {
			await this.clickToobBarButton(button.B_DELETE);
		}
		await utils.sleep(2000);
	},

	async getReadingPaneText() {
		return await app.client.getText(this.locators.contactsReadPane);
	}
};