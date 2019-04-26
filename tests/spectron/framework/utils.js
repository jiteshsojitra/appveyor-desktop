const app = require('./app-config');
const chai = require('chai');
const path = require('path');
const fs = require('fs');

module.exports = {
	elementExistTimeout: 10000,
	baseDir: __dirname + '/../',
	screenshotDir: process.env.HTML_REPORT_PATH || __dirname + '/../../../test-reports/spectron/screenshots/',

	configChai() {
		const chaiAsPromised = require('chai-as-promised');
		chai.should();
		chai.use(chaiAsPromised);
		return chai;
	},

	ensureDirectoryExistence(filePath) {
		let dirname = path.dirname(filePath);
		if (fs.existsSync(dirname)) {
			return true;
		}
		this.ensureDirectoryExistence(dirname);
		fs.mkdirSync(dirname);
	},

	takeScreenShotOnFailed(currentTest) {
		if (currentTest.state === 'failed') {
			let screenshotFilePath = this.screenshotDir + String(currentTest.state).toUpperCase() + " - " +
				String(currentTest.fullTitle()).replace(/[\W_]+/g, " ")
				.replace('Smoke', "- Smoke -")
				.replace('BHR', "- BHR -")
				.replace('Functional', "- Functional -").trim() + '.png';
			this.ensureDirectoryExistence(screenshotFilePath);
			app.client.saveScreenshot(screenshotFilePath);
		}
	},

	getUniqueString() {
		return String(Date.now() + Math.floor(Math.random() * 90 + 10));
	},

	getUniqueWords(count) {
		let uniqueWords = '';
		for (let i = 1; i <= count; i++) {
			uniqueWords += this.getUniqueString() + ' ';
		}
		return uniqueWords.trim();
	},

	async pressButton(buttonName) {
		await app.client.click('button=' + buttonName);
	},

	async pressKey(key) {
		await app.client.keys(key);
	},

	async debug() {
		await app.client.debug();
	},

	async sleep(msec) {
		await app.client.pause(msec);
	},

	async waitUntilDisappear(element) {
		let timeCount = 10;
		while (await app.client.isExisting(element) && timeCount > 0) {
			timeCount--;
			await app.client.pause(1000);
		}
	},

	async convertDate(date) {
		let msec = Date.parse(date);
		let d = new Date(msec);
		let months = ['January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'];
		return months[d.getUTCMonth()] + ' ' + Number(d.getUTCDate()) + ', ' + d.getUTCFullYear();
	},

	async getUserName(emailAddress) {
		return await emailAddress.substring(0, emailAddress.indexOf('@'));
	},

	// Helper func, reformat input string
	async escapeXml (str) {
		return str.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	},

	// Verify if string inclues to input arguments strings
	async isSubStringPresent(content, ...rest) {
		let result = '';
		for (let i = 0; i < rest.length; i++) {
			result = result + content.includes(rest[i]);
		}
		return !result.includes(false);
	},

	// Return subString of input innerTHML content which started with openTag, ended with closeTag and contains plainContent
	async splitInnerHTML(fullContent, plainContent, openTag, closeTag) {
		let splitContent = fullContent.split(plainContent);
		return String(fullContent.substring(splitContent[0].lastIndexOf(openTag), fullContent.indexOf(plainContent) + splitContent[1].indexOf(closeTag) + plainContent.length + closeTag.length));
	}
};