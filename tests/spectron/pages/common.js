const app = require('../framework/app-config');
const utils = require('../framework/utils');
const option = require('../framework/elements/option');
const button = require('../framework/elements/button');
const soap = require('../framework/soap-client');
let IS_LAB_RUN = false;

module.exports = {

	locators: {
		appTab: (tab) => '//span[@class="zimbra-client_menu-item_inner" and text()="' + tab + '"]',

		zimbraProxyURL: 'input#server-url',
		username: '//input[@class="zimbra-client_text-input_input"][@type="email"]',
		password: '//input[@type="password"]',
		signInButton: 'button=Sign in',
		forgotPassword: 'button=Forgot Password?',
		signInText: 'h1=Sign in',
		loggedInUser: 'span.zimbra-client_header-actions_headerActionTitle',
		logoutDropdown: 'div.zimbra-client_header span.zimbra-icon.zimbra-icon-caret-down.blocks_icon_md',
		continueButton: 'button=Continue',
		dialogCloseButton: 'div[role="dialog"] span.zimbra-icon-close',

		folderToggleSelector: '//div[@class="zimbra-client_folder-list_customFolderToggleName" and text()="Folders"]',
		contactHeader: 'header.zimbra-client_contacts_leftPanelHeader',
		globalAddressList: '//div[text()="Global Address List"]',
		addTaskbutton: 'div.zimbra-client_tasks_taskList button.zimbra-client_tasks_toggleAdd',
	},

	async configureDesktopClient() {
		await app.client.pause(3000);
		if (await app.client.isExisting(this.locators.zimbraProxyURL)) {
			await app.client.setValue(this.locators.zimbraProxyURL, soap.zimbraProxyURL);
			await app.client.click(this.locators.continueButton);
			await app.client.pause(5000);
		}
	},

	async loginBeforeTestRun(account) {
		await this.reloadApp();
		if (await app.client.isExisting(this.locators.dialogCloseButton)) {
			await app.client.click(this.locators.dialogCloseButton);
		}

		if (await app.client.isExisting(this.locators.logoutDropdown) === true) {
			for (let i=0; i<=2; i++) {
				await this.coreLogoutFromClient();
				if (await app.client.isExisting(this.locators.username) === true) {
					break;
				} else {
					await this.reloadApp();
				}
			}
		}

		for (let i=0; i<=2; i++) {
			if (await app.client.isExisting(this.locators.username) === true) {
				await this.coreLoginToClient(account);
				break;
			} else {
				await this.reloadApp();
			}
		}
	},

	async loginToClient(account) {
		await app.client.waitUntil(async () => await app.client.isExisting(this.locators.username), utils.elementExistTimeout);
		await this.coreLoginToClient(account);
		await app.client.pause(2000);
	},

	async coreLoginToClient(account) {
		await app.client.setValue(this.locators.username, account);
		await app.client.setValue(this.locators.password, soap.accountPassword);
		await app.client.click(this.locators.signInButton);
		await app.client.waitForExist(this.locators.appTab(button.B_MAIL_APP), utils.elementExistTimeout);
		await this.navigateApp(button.B_MAIL_APP);
	},

	async logoutFromClient() {
		await app.client.waitForExist(this.locators.logoutDropdown, utils.elementExistTimeout);
		await this.coreLogoutFromClient();
	},

	async coreLogoutFromClient() {
		await app.client.click(this.locators.logoutDropdown).click('span=' + option.O_LOGOUT);
		await app.client.waitForExist(this.locators.username, utils.elementExistTimeout);
	},

	async startApplication() {
		if (IS_LAB_RUN === false || process.env.APPVEYOR) {
			if (app.isRunning()) {
				await app.stop();
			}
			this.wait(8000);
			if (typeof process.env.TEST_SUITE !== 'undefined' && process.env.TEST_SUITE !== null) {
				IS_LAB_RUN = true;
			}
			return await app.start();
		}
	},

	async stopApplication() {
		if (typeof(process.env.TEST_SUITE) === 'undefined' || process.env.TEST_SUITE === null || process.env.APPVEYOR) {
			await app.stop();
			if (app.isRunning()) {
				this.wait(8000);
				await app.stop();
			}
		}
	},

	wait(ms) {
		let start = new Date().getTime();
		let end = start;
		while (end < start + ms) {
			end = new Date().getTime();
		}
	},

	async waitTillElementPresent(element) {
		await app.client.waitUntil(async () => await app.client.isExisting(element), utils.elementExistTimeout);
	},

	// Navigate to application tab
	async navigateApp(applicationTab) {
		await app.client.click(this.locators.appTab(applicationTab));
		switch (applicationTab) {
			case 'Mail':
				await this.waitTillElementPresent(this.locators.folderToggleSelector);
				this.wait(1000);
				break;
			case 'Contacts':
				await this.waitTillElementPresent(this.locators.globalAddressList);
				this.wait(1000);
				break;
			case 'Calendar':
				await this.waitTillElementPresent(this.locators.addTaskbutton);
				this.wait(1000);
				break;
			default:
		}
	},

	async reloadApp() {
		await app.client.refresh();
		await app.client.pause(4000);
	},

	async createAccount() {
		let account = await soap.createAccount(await soap.getAdminAuthToken());
		account.authToken = await soap.getAccountAuthToken(account.emailAddress);
		account.userName = await utils.getUserName(account.emailAddress);
		return account;
	},

	async deleteAccount(email) {
		let adminAuthToken = await soap.getAdminAuthToken();
		let accountId = await soap.getAccountId(adminAuthToken, email);
		if (accountId !== null && accountId) {
			await soap.deleteAccount(accountId, adminAuthToken);
		}
	}
};
