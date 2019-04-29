const app = require('../framework/app-config');
const mail = require('./mail');
const menu = require('../framework/elements/menu');
const folderLabel = require('../framework/elements/folder');
const button = require('../framework/elements/button');
const utils = require('../framework/utils');
const shellScript = require('shelljs');
const soap = require('../framework/soap-client');
const fs = require('fs');

module.exports = {

	locators: {
		folderContextMenuInput: '//div[contains(@class, "zimbra-client_context-menus_defaultContainer")]//input',
		folderGroup: (folderGroupName) => '//div[.="' + folderGroupName + '"][@class="zimbra-client_folder-list_groupToggle"]',
		folderItem: (folderName) => '//div[@class="zimbra-client_sidebar_inner"]//a[@title="' + folderName + '"]',
		folderContextMenuItem: (itemText) => '//div[contains(@class, "zimbra-client_context-menus_defaultContainer")]//a[.="' + itemText + '"]'
	},

	async createLocalFolder(folderName) {
		await app.client.moveToObject(this.locators.folderGroup(folderLabel.F_LOCAL_FOLDERS)).click(this.locators.folderGroup(folderLabel.F_LOCAL_FOLDERS) + 
			'//span[contains(@class, "zimbra-icon-plus blocks_icon_sm")]');
		await app.client.keys(folderName);
		await app.client.pause(500);
		await app.client.keys('Enter');
		await app.client.pause(2000);
	},

	async removeLocalStorage(user) {
		await shellScript.rm('-rf', await this.getLocalStorePath(user));
		await utils.sleep(1000);
	},

	async moveMailToLocalFolder(mailsubject, folderName) {
		await mail.selectMessage(mailsubject);
		await app.client.waitForExist(mail.locators.moveButton, utils.elementExistTimeout);
		await app.client.click(mail.locators.moveButton);
		await app.client.waitForExist(mail.locators.popoverContextMenuItem(folderName), utils.elementExistTimeout);
		await app.client.click(mail.locators.popoverContextMenuItem(folderName));
		await utils.sleep(3000);
	},

	async moveFolderToLocalFolder(mailFolder) {
		if (!await app.client.isExisting(this.locators.folderItem(mailFolder))) {
			await this.unCollapseGroupFolder(folderLabel.F_FOLDERS);
		}
		await this.selectFolderContextMenu(mailFolder, menu.M_MOVE_FOLDER);
		await this.searchFolderFromMenuContext(folderLabel.F_LOCAL_FOLDERS);
		let contextItem = this.locators.folderContextMenuItem(folderLabel.F_LOCAL_FOLDERS);
		await app.client.waitForExist(contextItem);
		await app.client.click(contextItem);
		await app.client.pause(1000);
	},

	async deleteFolder(folderName, emptyFolder = true) {
		await this.selectFolderContextMenu(folderName, menu.M_DELETE_FOLDER);
		if (!emptyFolder) {
			let okButton = mail.locators.blocksDialogButton(button.B_OK);
			await app.client.waitForExist(okButton);
			await app.client.click(okButton);
			await utils.sleep(1000);
		}
	},

	async selectFolderContextMenu(folderName, contextMenuText) {
		if (!await app.client.isExisting(this.locators.folderItem(folderName))) {
			await this.unCollapseGroupFolder(folderLabel.F_FOLDERS);
		}
		await app.client.waitForExist(this.locators.folderItem(folderName));
		await app.client.rightClick(this.locators.folderItem(folderName));
		await app.client.waitForExist(this.locators.folderContextMenuItem(contextMenuText), utils.elementExistTimeout);
		await app.client.click(this.locators.folderContextMenuItem(contextMenuText));
	},

	async getLocalStorePath(user) {
		let localStorePath = null;
		let rootPath = null;

		if (process.platform === 'darwin') {
			rootPath = `${process.env.HOME}/Library/Application Support/@zimbra/`;
			localStorePath = `${rootPath}${user}/Mail/`;
		} else {
			const userDirectory = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
			rootPath = `${userDirectory}\\AppData\\Roaming\\@zimbra\\`;
			localStorePath = `${rootPath}${user}\\Mail\\`;
		}
		if (typeof(user) == 'undefined') return rootPath;
		return localStorePath;
	},

	async searchFolderFromMenuContext(folderName) {
		await app.client.waitForExist(this.locators.folderContextMenuInput);
		await app.client.click(this.locators.folderContextMenuInput);
		await app.client.keys(folderName);
		await app.client.pause(500);
		await app.client.keys('Enter');
		await app.client.pause(1000);
	},

	async searchPopoverMenuItem(itemName) {
		await app.client.waitForExist(mail.locators.popoverMenuSearchInput);
		await app.client.click(mail.locators.popoverMenuSearchInput);
		await app.client.keys(itemName);
		await app.client.pause(500);
		await app.client.keys('Enter');
		await app.client.pause(1000);
	},

	async unCollapseFolder(folderName, subfolderName) {
		if (!await app.client.isExisting(this.locators.folderItem(subfolderName))) {
			await app.client.click(this.locators.folderItem(folderName) + '//span[@role="img"]');
		}
		await utils.sleep(1000);
	},

	async unCollapseGroupFolder(groupFolder) {
		await app.client.click(this.locators.folderGroup(groupFolder));
	},

	async removeAllLocalFolders() {
		await shellScript.rm('-rf', await this.getLocalStorePath() + 'tc*');
	},

	// ********* Helper Functions *********
	async isFolderExistInLocalStorage(user, folderName) {
		return fs.existsSync(await this.getLocalStorePath(user) + folderName);
	},

	async isFolderExistInGroupFolder(authToken, folderGroup, folderName) {
		let soapCheckExist = await soap.getFolder(authToken, folderName, folderLabel.F_MAIL_FOLDER_TYPE) !== null;
		if (!await app.client.isExisting(this.locators.folderGroup(folderGroup) + '//parent::div//a')) {
			return soapCheckExist && false;
		}
		return soapCheckExist && (await app.client.getText(this.locators.folderGroup(folderGroup) + '//parent::div//a')).includes(folderName);
	},

	async numberOfMailFilesInLocalStorage(user, folderName) {
		let count = 0;
		let fileList = shellScript.ls(await this.getLocalStorePath(user) + `${folderName}/`);
		for (const obj of fileList) {
			if (obj.endsWith('.eml')) count++;
		}
		return count;
	},

	async numberOfAttachmentFoldersInLocalStorage(user, folderName) {
		let count = 0;
		let fileList = shellScript.ls(await this.getLocalStorePath(user) + `${folderName}/`);
		for (const obj of fileList) {
			if (!(obj.endsWith('.eml'))) count++;
		}
		return count-1; // -1 as there is an additional json file in the folder.
	}
};
