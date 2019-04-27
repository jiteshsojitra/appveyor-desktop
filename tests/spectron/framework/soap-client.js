/*eslint new-cap: ["error", { "capIsNew": false }]*/
const config = require('../conf/config').getConfig();
const folder = require('./elements/folder');
const utils = require('./utils');

const fs = require('fs');
const get = require('lodash');
let restUploadRequest = require('request');
let requestPromise = require('request-promise-native');

const ZIMBRA_PROXY_URL = process.env.ZIMBRA_PROXY_URL || config.zimbraProxyURL;
const SERVER_HOST = process.env.SERVER_HOST || config.serverHost;
const SERVER_ADMIN_PORT = process.env.SERVER_ADMIN_PORT || config.adminPort;
const SERVER_CLIENT_PORT = process.env.SERVER_CLIENT_PORT || config.clientPort;
const SERVER_ADMIN_USERNAME = process.env.SERVER_ADMIN_USERNAME || config.adminUser;
const SERVER_ADMIN_PASSWORD = process.env.SERVER_ADMIN_PASSWORD || config.adminPassword;
const SERVER_ACCOUNT_PASSWORD = process.env.SERVER_ACCOUNT_PASSWORD || 'test123';

if (!SERVER_ADMIN_USERNAME || !SERVER_ADMIN_PASSWORD) {
	console.error('Error: SERVER_ADMIN_USERNAME & SERVER_ADMIN_PASSWORD must be set as an environment variable or in config for Spectron tests to run');
	process.exit(1);
}

module.exports = {
	zimbraProxyURL: ZIMBRA_PROXY_URL,
	serverHost: SERVER_HOST,
	adminPort: SERVER_ADMIN_PORT,
	clientPort: SERVER_CLIENT_PORT,
	adminUsername: SERVER_ADMIN_USERNAME,
	adminPassword: SERVER_ADMIN_PASSWORD,
	accountPassword: SERVER_ACCOUNT_PASSWORD,

	adminURL: 'https://' + SERVER_HOST + ':' + SERVER_ADMIN_PORT + '/service/admin/soap',
	soapURL: 'https://' + SERVER_HOST + ':' + SERVER_CLIENT_PORT + '/service/soap',

	// ++++++++++++++++++++++++++++++++++++ Server ++++++++++++++++++++++++++++++++++++

	async getAdminAuthToken(adminUsername = SERVER_ADMIN_USERNAME, adminPassword = SERVER_ADMIN_PASSWORD) {
		let requestObject =
			`<AuthRequest xmlns='urn:zimbraAdmin'>
				<name>${adminUsername}</name>
				<password>${adminPassword}</password>
			</AuthRequest>`;
		let request = this.makeSOAPEnvelope(requestObject, '');
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.AuthResponse.authToken[0]._content;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async getServiceHost(adminAuthToken) {
		let requestObject = `<GetAllServersRequest xmlns='urn:zimbraAdmin'></GetAllServersRequest>`;
		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.GetAllServersResponse.server[0].name;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async createDomain(adminAuthToken, domainName) {
		let serviceHost = await this.getServiceHost(adminAuthToken);
		let requestObject =
			`<CreateDomainRequest xmlns='urn:zimbraAdmin'>
				<name>${domainName}</name>
			</CreateDomainRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });

			// Create galsync account
			let requestGalSyncObject =
				`<CreateGalSyncAccountRequest xmlns='urn:zimbraAdmin' name='datasource_${domainName}' folder='_${domainName}' type='zimbra' domain='${domainName}' server='${serviceHost}'>
					<account by='name'>galsync@${domainName}</account>
					<password by='name'>${this.accountPassword}</password>
				</CreateGalSyncAccountRequest>`;

			let requestGalSync = this.makeSOAPEnvelope(requestGalSyncObject, adminAuthToken);

			try {
				await requestPromise.post({ uri: this.adminURL, body: requestGalSync, strictSSL: false, timeout: 10000 });
				return JSON.parse(response).Body.CreateDomainResponse.domain[0].id;
			} catch (error) {
				throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
			}
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async syncGalAccount(adminAuthToken, domainName) {
		let galSyncAccount = 'galsync@' + (domainName || config.testDomain);
		let galSyncDataSource = `datasource_${domainName}`;
		let galSyncAccountId = await this.getAccountPreference(adminAuthToken, galSyncAccount, 'zimbraId');

		let requestObject =
			`<SyncGalAccountRequest xmlns='urn:zimbraAdmin'>
				<account id='${galSyncAccountId}'>
					<datasource by='name' fullSync='true' reset='true'>${galSyncDataSource}</datasource>
				</account>
			</SyncGalAccountRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);

		try {
			await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async deleteDomain(adminAuthToken, domainId) {
		let requestObject =
			`<DeleteDomainRequest xmlns='urn:zimbraAdmin'>
				<id>${domainId}</id>
			</DeleteDomainRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);
		try {
			await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async createAccount(adminAuthToken, domainName = config.testDomain, emailAddress = null) {
		let domain = (domainName || config.testDomain);
		if (emailAddress == null || typeof emailAddress === 'undefined') {
			emailAddress = `tc${await utils.getUniqueString()}@${domain}`;
		}
		let password = this.accountPassword;

		// Create account
		let createAccountRequestObject =
			`<CreateAccountRequest xmlns='urn:zimbraAdmin'>
				<sn>Cafe</sn>
				<givenName>Test</givenName>
				<displayName>TestCafe</displayName>
				<password>${password}</password>
				<name>${emailAddress}</name>

				<a n='zimbraFeatureSMIMEEnabled'>TRUE</a>
				<a n='zimbraPrefCalendarInitialView'>week</a>
				<a n='zimbraPrefTimeZoneId'>America/New_York</a>
				<a n='zimbraPrefCalendarApptReminderWarningTime'>0</a>
				<a n='zimbraPrefCalendarShowPastDueReminders'>FALSE</a>
				<a n='zimbraPrefOutOfOfficeStatusAlertOnLogin'>FALSE</a>
				<a n='zimbraPrefOutOfOfficeReplyEnabled'>FALSE</a>
				<a n='zimbraPrefWarnOnExit'>FALSE</a>
			</CreateAccountRequest>`;

		let request = this.makeSOAPEnvelope(createAccountRequestObject, adminAuthToken);

		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
			let accountId = JSON.parse(response).Body.CreateAccountResponse.account[0].id;
			return { accountId, emailAddress, password };
		} catch (error) {

			if (String(error).indexOf('email address already exists') === -1)
				throw new Error(String(error));
			else {
				let accountId = await this.getAccountPreference(adminAuthToken, emailAddress, 'zimbraId');
				return { accountId, emailAddress, password };
			}
		}
	},

	async modifyAccount(adminAuthToken, accountId, attribute, value) {
		let requestObject = `
			<ModifyAccountRequest xmlns='urn:zimbraAdmin'>
				<id>${accountId}</id>
				<a n='${attribute}'>${value}</a>
			</ModifyAccountRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });

			return JSON.parse(response).Body.ModifyAccountResponse.account[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async modifyPrefs(accountAuthToken, name, value) {
		let requestObject = `
			<ModifyPrefsRequest xmlns='urn:zimbraAccount'>
				<pref name="${name}">${value}</pref>
			</ModifyPrefsRequest>`;
			
		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
			return response;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async getAccountPreference(adminAuthToken, account, attribute) {
		let requestObject = `
			<GetAccountRequest xmlns='urn:zimbraAdmin'>
				<account by='name'>${account}</account>
			</GetAccountRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });


			let accountAttributes = JSON.parse(response).Body.GetAccountResponse.account;
			for (let i = 0; i < accountAttributes[0].a.length; i++) {
				if (accountAttributes[0].a[i].n === attribute) {
					return accountAttributes[0].a[i]._content;
				}
			}
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async getAccountId(adminAuthToken, account) {
		let requestObject = `
			<GetAccountRequest xmlns='urn:zimbraAdmin'>
				<account by='name'>${account}</account>
			</GetAccountRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, adminAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.GetAccountResponse.account[0].id;
		} catch (error) {
			if (JSON.parse(error.response.body).Body.Fault.Reason.Text.includes('no such account')) {
				return null;
			}
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async deleteAccount(account, adminAuthToken) {
		let deleteAccountRequestObject =
			`<DeleteAccountRequest xmlns='urn:zimbraAdmin'>
				<id>${account}</id>
			</DeleteAccountRequest>`;

		let request = this.makeSOAPEnvelope(deleteAccountRequestObject, adminAuthToken);
		try {
			await requestPromise.post({ uri: this.adminURL, body: request, strictSSL: false, timeout: 10000 });
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async getAccountAuthToken(account) {
		let authRequestObject =
			`<AuthRequest xmlns='urn:zimbraAccount'>
				<account by='name'>${account}</account>
				<password>${this.accountPassword}</password>
			</AuthRequest>`;

		let request = this.makeSOAPEnvelope(authRequestObject);

		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.AuthResponse.authToken[0]._content;
		} catch (error) {
			throw new Error(error);
		}
	},

	async getInfo(accountAuthToken) {
		let request = this.makeSOAPEnvelope(`<GetInfoRequest xmlns='urn:zimbraAccount'/>`, accountAuthToken);

		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });

			return JSON.parse(response).Body.GetInfoResponse;
		} catch (error) {

			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	// ++++++++++++++++++++++++++++++++++++ Common ++++++++++++++++++++++++++++++++++++

	async searchItem(accountAuthToken, searchQuery, searchType, searchQueryComplete = false) {
		if (searchType === folder.F_CONTACTS_FOLDER_VIEW) {
			searchQuery = '#firstname:' + searchQuery;
		} else if ( !searchQueryComplete ) {
			searchQuery = 'subject:' + searchQuery;
		}

		let requestObject =
			`<SearchRequest types='${searchType}' xmlns='urn:zimbraMail'>
				<query>${searchQuery}</query>
			</SearchRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);


		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			if (searchType === folder.F_MAIL_FOLDER_MESSAGE_VIEW) {
				let parseResponse = JSON.parse(response).Body.SearchResponse.m[0];
				return { id: parseResponse.id,
					subject: parseResponse.su,
					body: parseResponse.fr
				};
			} else if (searchType === folder.F_CONTACTS_FOLDER_VIEW) {
				let parseResponse = JSON.parse(response).Body.SearchResponse.cn[0];
				return { id: parseResponse.id,
					fileAsStr: parseResponse.fileAsStr,
					firstName: parseResponse._attrs.firstName,
					middleName: parseResponse._attrs.middleName,
					lastName: parseResponse._attrs.lastName,
					company: parseResponse._attrs.company,
					phone: parseResponse._attrs.phone,
					email: parseResponse._attrs.email,
					birthday: parseResponse._attrs.birthday,
					anniversary: parseResponse._attrs.anniversary,
					jobTitle: parseResponse._attrs.jobTitle,
					website: parseResponse._attrs.website,
					notes: parseResponse._attrs.notes
				};
			} else if (searchType === folder.F_CALENDAR_FOLDER_VIEW) {
				return JSON.parse(response).Body.SearchResponse.appt[0].id;
			} else if (searchType === folder.F_TASKS_FOLDER_VIEW) {
				return { id: JSON.parse(response).Body.SearchResponse.task[0].id,
					name: JSON.parse(response).Body.SearchResponse.task[0].name,
					priority: JSON.parse(response).Body.SearchResponse.task[0].priority,
					fr: JSON.parse(response).Body.SearchResponse.task[0].fr
				};
			} else if (searchType === folder.F_NOTES_FOLDER_VIEW) {
				return JSON.parse(response).Body.SearchResponse.doc[0].id;
			}
		} catch (error) {
			return null;
		}
	},

	async createFolder(accountAuthToken, folderName, folderView, parentFolderId = folder.F_ROOT) {
		let requestObject;
		if (parentFolderId === folder.F_ROOT) {
			parentFolderId = '1';
		}

		if (folderView === folder.F_CALENDAR_FOLDER_VIEW) {
			requestObject = `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder>
					<l>${parentFolderId}</l>
					<name>${folderName}</name>
					<view>${folderView}</view>
					<color>3</color>
					<sync>1</sync>
				</folder>
			</CreateFolderRequest>`;
		} else {
			requestObject = `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder>
					<l>${parentFolderId}</l>
					<name>${folderName}</name>
					<view>${folderView}</view>
					<sync>1</sync>
				</folder>
			</CreateFolderRequest>`;
		}

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });

			return JSON.parse(response).Body.CreateFolderResponse.folder[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async getFolder(accountAuthToken, folderName, folderView, parentFolderName) {
		let folderPath = null;
		if (folderView === folder.F_NOTES_FOLDER_VIEW) {
			folderPath = '/Notepad';
		} else if (parentFolderName === null || String(typeof parentFolderName) === 'undefined') {
			folderPath = `/${folderName}`;
		} else {
			folderPath = `/${parentFolderName}/${folderName}`;
		}

		let requestObject =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder>
					<path>${folderPath}</path>
				</folder>
				<view>${folderView}</view>
			</GetFolderRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });

			return JSON.parse(response).Body.GetFolderResponse.folder[0].id;
		} catch (error) {
			return null;
		}
	},


	// ++++++++++++++++++++++++++++++++++++ Mail ++++++++++++++++++++++++++++++++++++

	async injectMime(accountAuthToken, filePath, folderName = folder.F_INBOX) {
		let cookie = restUploadRequest.cookie(`ZM_AUTH_TOKEN=${accountAuthToken}`);
		let headers = {
			'Content-Type': 'multipart/form-data; charset=UTF-8',
			Cookie: cookie
		};

		let options = null;
		let uploadFile = filePath.replace(' ', '').split(',');
		for (let i=0; i<uploadFile.length; i++) {
			options = {
				url: `https://${this.serverHost}:${this.clientPort}/service/upload`,
				method: 'POST',
				headers,
				strictSSL: false,
				formData: {
					'upload-file': fs.createReadStream(uploadFile[i])
				}
			};
			let attachmentId = null;
			restUploadRequest(options, async (error, response, body) => {
				if (!error && response.statusCode === 200) {
					attachmentId = body.substr(body.indexOf('null') + 7, body.lastIndexOf(');') - (body.indexOf('null') + 8));
					// Add message
					let requestObject =
						`<AddMsgRequest xmlns='urn:zimbraMail'>
							<m l='${folderName}' f='u' aid='${attachmentId}'></m>
						</AddMsgRequest>`;
					await this.soapSend(accountAuthToken, requestObject);

				} else {
					throw new Error('Error occured in uploading the file' + error);
				}
			});
		}
	},


	async soapSend(accountAuthToken, requestObject) {
		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body;
		} catch (error) {

			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	makeSOAPEnvelope(requestObject, authToken) {
		return (
			`<?xml version='1.0'?>
			<soap:Envelope xmlns:soap='http://www.w3.org/2003/05/soap-envelope'>
				<soap:Header>
					<context xmlns='urn:zimbra'>
						<authToken>${authToken}</authToken>
						<userAgent name='zmsoap'/>
						<format xmlns='' type='js'/>
						<nosession></nosession>
					</context>
				</soap:Header>
				<soap:Body>
					${requestObject}
				</soap:Body>
			</soap:Envelope>`
		);
	},

	async sendMessage(accountAuthToken, to, subject = 'Default test subject', body = 'Default test body', cc = '') {
		let errorCode = 'mail.SEND_ABORTED_ADDRESS_FAILURE';
		let requestObject =
			`<SendMsgRequest xmlns='urn:zimbraMail'>
				<m>
					<e t='t' a='${to}'/>
					<e t='c' a='${cc}'/>
					<su>${subject}</su>
					<mp ct='text/plain'>
						<content>${body}</content>
					</mp>
				</m>
			</SendMsgRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			await utils.sleep(1000);
			return JSON.parse(response).Body.SendMsgResponse.m[0].id;
		} catch (error) {
			if (JSON.parse(error.response.body).Body.Fault.Detail.Error.Code === errorCode) {
				return errorCode;
			}
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async replyToMessage(accountAuthToken, mailToAccount, messageId, subject, body = 'Default reply body', mailCcAccount = '') {
		let requestObject =
			`<SendMsgRequest xmlns='urn:zimbraMail'>
				<m originid='${messageId}' rt='r'>
					<e t='t' a='${mailToAccount}'/>
					<e t='c' a='${mailCcAccount}'/>
					<su>RE: ${subject}</su>
					<mp ct='text/plain'>
						<content>${body}</content>
					</mp>
				</m>
			</SendMsgRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.SendMsgResponse.m[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async forwardMessage(accountAuthToken, mailToAccount, messageId, subject, body = 'Default forward body', mailCcAccount = '') {
		let requestObject =
			`<SendMsgRequest xmlns='urn:zimbraMail'>
				<m originid='${messageId}' rt='w'>
					<e t='t' a='${mailToAccount}'/>
					<e t='c' a='${mailCcAccount}'/>
					<su>FWD: ${subject}</su>
					<mp ct='text/plain'>
						<content>${body}</content>
					</mp>
				</m>
			</SendMsgRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.SendMsgResponse.m[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async sendMsgRequestHtmlContent(accountAuthToken, mailToAccount, mailSubject, plainTextContent, htmlContent) {
		let requestObject =
			`<SendMsgRequest xmlns='urn:zimbraMail'>
				<m>
				<e t='t' a='${mailToAccount}'/>
				<su>${mailSubject}</su>
					<mp ct='multipart/alternative'>
						<mp ct='text/plain'>
							<content>${plainTextContent}</content>
						</mp>
						<mp ct='text/html'>
							<content>${htmlContent}</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`;

		return await this.soapSend(accountAuthToken, requestObject);
	},

	async saveDraft(accountAuthToken, mailToAccount, mailSubject, mailBody, mailCcAccount = '') {
		let requestObject =
			`<SaveDraftRequest xmlns='urn:zimbraMail'>
				<m>
					<e t='t' a='${mailToAccount}'/>
					<e t='c' a='${mailCcAccount}'/>
					<su>${mailSubject}</su>
					<mp ct='text/html'>
						<content>${mailBody}</content>
					</mp>
				</m>
			</SaveDraftRequest>`;

		return await this.soapSend(accountAuthToken, requestObject);
	},

	async createConversation(mailToAuthToken1, mailToAuthToken2, mailToAccount1, mailToAccount2, subject, noOfMessage) {
		let messageId = await this.sendMessage(mailToAuthToken2, mailToAccount1, subject);
		for (let i=1; i < noOfMessage; i++) {
			if (i%2 !== 0) {
				await this.replyToMessage(mailToAuthToken1, mailToAccount2, messageId, subject, `Replying ${i} ${await utils.getUniqueWords(3)}`);
			} else {
				await this.replyToMessage(mailToAuthToken2, mailToAccount1, messageId, subject, `Replying ${i} ${await utils.getUniqueWords(3)}`);
			}
			await utils.sleep(1000);
		}
		await utils.sleep(1000);
	},

	async searchAndGetConversation(accountAuthToken, subject, folderName = null) {
		let folderQuery = '';
		if (folderName !== null) {
			let folderId = await this.getFolder(accountAuthToken, folderName, folder.F_MAIL_FOLDER_TYPE);
			folderQuery = `inid: ${folderId} `;
		}

		let requestObject =
			`<SearchRequest types='conversation' xmlns='urn:zimbraMail'>
				<query>${folderQuery}subject:('"'${subject}'"')</query>
			</SearchRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });

			let conversationId = JSON.parse(response).Body.SearchResponse.c[0].id;
			return await this.getConversation(accountAuthToken, conversationId);
		} catch (error) {
			return null;
		}
	},

	async getConversation(accountAuthToken, conversationId) {
		let requestObject =
			`<GetConvRequest xmlns='urn:zimbraMail'>
				<c id='${conversationId}'/>
			</GetConvRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);


		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });

			response = JSON.parse(response).Body.GetConvResponse.c[0];

			let conversation = await this.extractConversationDetails(response);
			return conversation;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	// this method use for extracting message details from the conversation response
	async extractConversationDetails(response) {
		let messageArray = [];

		for (let message of response.m) {
			let mdata = await this.extractMessageDetails(message);
			messageArray.push(mdata);
		}

		let conversation = {};
		conversation.subject = response.su;
		conversation.messages = messageArray;

		return conversation;
	},

	async getMessage(accountAuthToken, messageId) {
		let requestObject =
			`<GetMsgRequest xmlns='urn:zimbraMail'>
				<m id='${messageId}' html='1'/>
			</GetMsgRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			response = JSON.parse(response).Body.GetMsgResponse.m[0];

			let messageDetails = await this.extractMessageDetails(response);
			return messageDetails;
		} catch (error) {
			return null;
		}
	},

	async searchMessage(accountAuthToken, subject, folderName = null) {
		let folderQuery = '';
		if (folderName !== null) {
			let folderId = await this.getFolder(accountAuthToken, folderName, folder.F_MAIL_FOLDER_TYPE);
			folderQuery = `inid: ${folderId} `;
		}
		let requestObject =
			`<SearchRequest xmlns='urn:zimbraMail' types='message'>
				<query>${folderQuery}subject:('"'${subject}'"')</query>
			</SearchRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.SearchResponse.m[0].id;
		} catch (error) {
			return null;
		}
	},

	async searchAndGetMessage(accountAuthToken, subject, folderName = null) {
		try {
			let messageId = await this.searchMessage(accountAuthToken, subject, folderName);
			return await this.getMessage(accountAuthToken, messageId);
		} catch (error) {
			return null;
		}
	},

	// This method used for extracting message details from the GetMsgResponse
	async extractMessageDetails(response) {
		let messageData = {
			to: '',
			cc: '',
			filename: ''
		};
		try {
			let toArray = [], ccArray= [];
			response.e.forEach(users => {
				if (users.t === 'f') {
					messageData.from = users.a;
				}
				if (users.t === 's') {
					messageData.sender = users.a;
				}
				if (users.t === 't') {
					toArray.push(users.a);
				}
				if (users.t === 'c') {
					ccArray.push(users.a);
				}
			});

			messageData.to = toArray;
			messageData.cc = ccArray;
			messageData.attachment = false;
			messageData.subject = response.su;
			messageData.textPlain = response.fr;

			let attachedFileList = [];
			if (String(typeof response.mp) !== 'undefined') {
				response.mp.forEach(mes => {
					if (String(mes.ct).includes('multipart')){
						this.extractMimeData(messageData, attachedFileList, mes.mp);
					} else {
						let messageArray = [];
						messageArray.push(mes);
						this.extractMimeData(messageData, attachedFileList, messageArray);
					}
				});
				messageData.attachmentList = attachedFileList.join(',');
			}
			return messageData;
		} catch (error) {
			return null;
		}
	},

	extractMimeData(mimeObject, fileObject, messagePartArray){
		messagePartArray.forEach(messagePart => {
			if (messagePart.ct === 'text/plain') {
				mimeObject.textPlainMessagePart = messagePart.content;
			}
			if (messagePart.ct === 'text/html') {
				mimeObject.textHtmlMessagePart = messagePart.content;
			}
			if (messagePart.cd === 'attachment') {
				mimeObject.externalAttachmentMessagePart = true;
				fileObject.push(messagePart.filename);
			}
			if (messagePart.cd === 'inline') {
				mimeObject.inlineAttachmentMessagePart = true;
				fileObject.push(messagePart.filename);
			}
			if (String(messagePart.ct).includes('multipart')){
				this.extractMimeData(mimeObject, fileObject, messagePart.mp);
			}
		});
	},

	// Remove the message from folder to Trash
	async trashMessage(accountAuthToken, subject, folderName = folder.F_INBOX) {
		let messageId = await this.searchMessage(accountAuthToken, subject, folderName);
		let requestObject =
			`<MsgActionRequest xmlns='urn:zimbraMail'>
        		<action id='${messageId}' op='trash'/>
			</MsgActionRequest>`;
		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			response = JSON.parse(response).Body.MsgActionResponse.action.id;
			return response;
		} catch (error) {
			return null;
		}
	},

	// Permanently delete message from the account
	async deleteMessage(accountAuthToken, subject, folderName = folder.F_INBOX) {
		let messageId = await this.trashMessage(accountAuthToken, subject, folderName);
		let requestObject =
			`<MsgActionRequest xmlns='urn:zimbraMail'>
        		<action id='${messageId}' op='delete' tcon='tjo'/>
			</MsgActionRequest>`;
		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return response;
		} catch (error) {
			return null;
		}
	},


	// ++++++++++++++++++++++++++++++++++++ Contacts ++++++++++++++++++++++++++++++++++++

	async createContact(accountAuthToken, folderId, firstName, lastName = 'defaultLastName', emailAddress) {
		let requestObject =
			`<CreateContactRequest xmlns='urn:zimbraMail'>
				<cn l='${folderId}'>
					<a n='firstName'>${firstName}</a>
					<a n='lastName'>${lastName}</a>
					<a n='email'>${emailAddress}</a>
				</cn>
			 </CreateContactRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);

		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.CreateContactResponse.cn[0].id;
		} catch (error) {

			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async createContactWithCertificate(accountAuthToken, folderId, firstName, lastName = 'defaultLastName', emailAddress, certificate) {
		let requestObject =
			`<CreateContactRequest xmlns='urn:zimbraMail'>
				<cn l='${folderId}'>
					<a n='firstName'>${firstName}</a>
					<a n='lastName'>${lastName}</a>
					<a n='email'>${emailAddress}</a>
					<a n='userCertificate'>${certificate}</a>
				</cn>
			 </CreateContactRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.CreateContactResponse.cn[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async createContactWithEmails(accountAuthToken, folderId, firstName, lastName = 'defaultLastName', emailAddress1, emailAddress2) {
		let requestObject =
			`<CreateContactRequest xmlns='urn:zimbraMail'>
				<cn l='${folderId}'>
					<a n='firstName'>${firstName}</a>
					<a n='lastName'>${lastName}</a>
					<a n='email'>${emailAddress1}</a>
					<a n='email2'>${emailAddress2}</a>
				</cn>
			 </CreateContactRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.CreateContactResponse.cn[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async createContactList(accountAuthToken, folderId, listName) {
		let requestObject =
			`<CreateContactRequest xmlns='urn:zimbraMail'>
				<cn l='${folderId}'>
					<a n='type'>group</a>
					<a n='nickname'>${listName}</a>
					<a n='fileAs'>8:${listName}</a>
				</cn>
			</CreateContactRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.CreateContactResponse.cn[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async assignToContactList(accountAuthToken, listId, contactID) {
		let requestObject =
			`<ModifyContactRequest xmlns='urn:zimbraMail'>
				<cn>
					<id>${listId}</id>
					<l>7</l>
					<m>
						<op>+</op>
						<type>C</type>
						<value>${contactID}</value>
					</m>
				</cn>
			 </ModifyContactRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return JSON.parse(response).Body.ModifyContactResponse.cn[0].id;
		} catch (error) {
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	// This does not work. ##TODO: fix search
	async searchAndGetContact(accountAuthToken, firstName) {
		let requestObject =
			`<SearchRequest types='contact' xmlns='urn:zimbraMail'>
				<query>#firstname:(${firstName})</query>
			</SearchRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			let contactId = JSON.parse(response).Body.SearchResponse.cn[0].id;
			return await this.getContact(accountAuthToken, contactId);
		} catch (error) {
			return null;
		}
	},

	async getContact(accountAuthToken, contactId) {
		const errorCode = 'mail.NO_SUCH_CONTACT';
		let requestObject =
			`<GetContactsRequest xmlns='urn:zimbraMail'>
				<cn id='${contactId}'/>
			</GetContactsRequest>`;

		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });

			response = JSON.parse(response).Body.GetContactsResponse.cn[0];
			let contact = await this.extractContactDetails(response);
			return contact;

		} catch (error) {
			if (JSON.parse(error.response.body).Body.Fault.Detail.Error.Code === errorCode) {
				return errorCode;
			}
			throw new Error(`${error.statusCode} ${JSON.parse(error.response.body).Body.Fault.Reason.Text}`);
		}
	},

	async extractContactDetails(response) {
		let contactData = {};
		contactData.folderId = get(response, 'l', '');
		contactData.rev = get(response, 'rev', '');
		contactData.fileAsStr = get(response, 'fileAsStr', '');
		contactData.firstName = get(response._attrs, 'firstName', '');
		contactData.lastName = get(response._attrs, 'lastName', '');
		contactData.website = get(response._attrs, 'website', '');
		contactData.notes = get(response._attrs, 'notes', '');
		contactData.jobTitle = get(response._attrs, 'jobTitle', '');
		contactData.middleName = get(response._attrs, 'middleName', '');
		contactData.company = get(response._attrs, 'company', '');
		contactData.anniversary = get(response._attrs, 'anniversary', '');
		contactData.birthday = get(response._attrs, 'birthday', '');
		contactData.nickname = get(response._attrs, 'nickname', '');
		contactData.homeCity = get(response._attrs, 'homeCity', '');
		contactData.homeCountry = get(response._attrs, 'homeCountry', '');
		contactData.homeStreet = get(response._attrs, 'homeStreet', '');
		contactData.homeState = get(response._attrs, 'homeState', '');

		let emailArray = [], phoneArray = [];
		Object.keys(response._attrs).forEach(key => {
			if (key.indexOf('email') >= 0) emailArray.push(get(response._attrs,key));
			if (key.indexOf('phone') >= 0 || key.indexOf('mobile') >=0) phoneArray.push(get(response._attrs,key));
		});
		contactData.phone = phoneArray;
		contactData.email = emailArray;

		return contactData;
	},

	// ++++++++++++++++++++++++++++++++++++ Folders ++++++++++++++++++++++++++++++++++++

	async removeFolder(accountAuthToken, folderId) {
		let requestObject =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
        		<action id='${folderId}' op='move' l='3'/>
			</FolderActionRequest>`;
		let request = this.makeSOAPEnvelope(requestObject, accountAuthToken);
		try {
			let response = await requestPromise.post({ uri: this.soapURL, body: request, strictSSL: false, timeout: 10000 });
			return response;
		} catch (error) {
			return null;
		}
	}
};

