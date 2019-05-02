const config = require('./config').getConfig();
const soap = require('../framework/soap-client');
const common = require('../pages/common');
const contacts = require('../pages/contacts');
const path = require('path');
const utils = require('../framework/utils');

describe('Configure desktop client', function() {
	this.timeout(0);

	it('Configure | Create smime accounts', async() => {
		let adminAuthToken = await soap.getAdminAuthToken();
		let accounts = [config.user1, config.user2, config.user3, config.user4, config.user5];
		for (let i=0; i<=accounts.length-1; i++) {
			console.log('     Creating account: ' + accounts[i] + '...'); // eslint-disable-line
			await common.deleteAccount(accounts[i]);
			await soap.createAccount(adminAuthToken, config.testDomain, accounts[i]);
		}
	});


	it('Configure | Create contacts with certificate for smime accounts', async() => {
		// Create contacts & inject inline image attachment mail for smime users
		let currentUser;
		let lastName = `last${await utils.getUniqueString()}`;
		let filePath = path.join(utils.baseDir, '/data/mimes/single-inline-attachment.txt');

		currentUser = config.user1;
		console.log('     Creating contat with certificate: ' + currentUser + "..."); // eslint-disable-line
		await contacts.createContactWithCertificate(currentUser, config.user2.split('@')[0], lastName, config.user2, config.user2Certificate);
		await contacts.createContactWithCertificate(currentUser, config.user3.split('@')[0], lastName, config.user3, config.user3Certificate);
		await soap.injectMime(await soap.getAccountAuthToken(currentUser), filePath);

		currentUser = config.user2;
		console.log('     Creating contat with certificate: ' + currentUser + "..."); // eslint-disable-line
		await contacts.createContactWithCertificate(currentUser, config.user1.split('@')[0], lastName, config.user1, config.user1Certificate);
		await contacts.createContactWithCertificate(currentUser, config.user3.split('@')[0], lastName, config.user3, config.user3Certificate);
		await soap.injectMime(await soap.getAccountAuthToken(currentUser), filePath);

		currentUser = config.user3;
		console.log('     Creating contat with certificate: ' + currentUser + "..."); // eslint-disable-line
		await contacts.createContactWithCertificate(currentUser, config.user1.split('@')[0], lastName, config.user1, config.user1Certificate);
		await contacts.createContactWithCertificate(currentUser, config.user2.split('@')[0], lastName, config.user2, config.user2Certificate);
		await soap.injectMime(await soap.getAccountAuthToken(currentUser), filePath);

		currentUser = config.user4;
		console.log('     Creating contat with certificate: ' + currentUser + "..."); // eslint-disable-line
		await contacts.createContactWithCertificate(currentUser, config.user1.split('@')[0], lastName, config.user1, config.user1Certificate);
		await contacts.createContactWithCertificate(currentUser, config.user2.split('@')[0], lastName, config.user2, config.user2Certificate);
		await soap.injectMime(await soap.getAccountAuthToken(currentUser), filePath);

		currentUser = config.user5;
		console.log('     Creating contat with certificate: ' + currentUser + "..."); // eslint-disable-line
		await contacts.createContactWithCertificate(currentUser, config.user3.split('@')[0], lastName, config.user3, config.user3Certificate);
		await contacts.createContactWithCertificate(currentUser, config.user4.split('@')[0], lastName, config.user4, config.user4Certificate);
		await soap.injectMime(await soap.getAccountAuthToken(currentUser), filePath);
	});

	it('Configure | Start desktop client first time to set up zimbra proxy URL', async() => {
		console.log('     Setting up zimbra proxy URL...'); // eslint-disable-line
		await common.configureDesktopClient();
	});
});
