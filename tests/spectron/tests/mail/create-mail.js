const app = require('../../framework/app-config');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const mail = require('../../pages/mail');
const folder = require('../../framework/elements/folder');
const textfield = require('../../framework/elements/textfield');
const soap = require('../../framework/soap-client');

describe('Create mail', function() {
	this.timeout(0);
	let account = {};

	async function beforeEachTest() {
		account = await common.createAccount();
		await common.loginBeforeTestRun(account.emailAddress);
	}

	before(async () => {
		await common.startApplication();
		utils.configChai();
	});
	after(async() => {
		await common.stopApplication();
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


	it('Smoke | Compose basic mail with subject, body, to and cc recipient | C581664', async() => {
		let mailToAccount = await common.createAccount();
		let mailCcAccount = await common.createAccount();
		let messageObject = Object.create(mail.message);
		messageObject.body = 'body' + utils.getUniqueString();
		messageObject.subject = 'subject' + utils.getUniqueString(),
		messageObject.toRecipients = mailToAccount.emailAddress;
		messageObject.ccRecipients = mailCcAccount.emailAddress;

		await mail.clickNewMessageButton();
		await mail.enterMailSubject(messageObject.subject);
		await mail.enterPlainTextBodyContent(messageObject.body);
		await mail.enterRecipient(textfield.T_TO, messageObject.toRecipients);
		await mail.enterRecipient(textfield.T_CC, messageObject.ccRecipients);
		await utils.sleep(1000);

		let composeFieldText = await app.client.getText(mail.locators.composeField);
		composeFieldText.should.contain(account.emailAddress, 'Verify sender account address');
		composeFieldText.should.contain(mailToAccount.userName, 'Verify to account address');
		composeFieldText.should.contain(mailCcAccount.userName, 'Verify cc account address');
		composeFieldText.should.contain(messageObject.body, 'Verify mail body content');

		await mail.clickSendbutton();
		await mail.selectFolder(folder.F_SENT);
		await app.client.waitForExist(mail.locators.messageSubjectSelector(messageObject.subject));
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present in Sent folder');

		let getMailToResponse = await soap.searchAndGetMessage(mailToAccount.authToken, messageObject.subject);
		getMailToResponse.textPlain.should.eql(messageObject.body, 'Verify to receipient mail body content');
		let getMailCcResponse = await soap.searchAndGetMessage(mailCcAccount.authToken, messageObject.subject);
		getMailCcResponse.textPlain.should.eql(messageObject.body, 'Verify cc recipient mail body content');
	});


	it('Smoke | Compose basic mail with multi-lined body content | C1707400', async() => {
		let mailToAccount = await common.createAccount();
		let messageObject = Object.create(mail.message);
		let line1 = 'Line 1' + utils.getUniqueString();
		let line2 = 'Line 2' + utils.getUniqueString();
		messageObject.body =  `${line1}\n${line2}`;
		messageObject.subject = 'subject' + utils.getUniqueString(),
		messageObject.toRecipients = mailToAccount.emailAddress;

		await mail.clickNewMessageButton();
		await mail.enterMailSubject(messageObject.subject);
		await mail.enterPlainTextBodyContent(messageObject.body);
		await mail.enterRecipient(textfield.T_TO, messageObject.toRecipients);
		await mail.clickSendbutton();

		await mail.selectFolder(folder.F_SENT);
		await app.client.waitForExist(mail.locators.messageSubjectSelector(messageObject.subject));
		await mail.isMessagePresent(messageObject.subject).should.eventually.equal(true, 'Verify message is present in Sent folder');

		let getMailToResponse = await soap.searchAndGetMessage(mailToAccount.authToken, messageObject.subject);
		getMailToResponse.textHtmlMessagePart.should.contain(line1 + '<div>' + line2);
	});


	it('Smoke | Compose basic mail with HTML formatting of body content | C1276602', async() => {
		let mailToAccount = await common.createAccount();
		let mailSubject = 'subject' + await utils.getUniqueString();
		let fontSize = 'size="5"';
		let fontFace = 'face="Verdana, Geneva, sans-serif"';
		let fontStr = 'Font';
		let bold = '<div><b>Bold</b></div>';
		let italic = '<div><i>Italic</i></div>';
		let underline = '<div><u>Underline</u></div>';
		let textColor = 'color="#ffffff"';
		let textBackgroundColor = 'style="background-color: rgb(54, 119, 20);"';
		let textColorString = 'Text Color';
		let listDot = '<ul><li>List dot line 1<br></li><li>List dot line 2</li></ul>';
		let listNumber = '<div><ol><li>List number line 1<br></li><li>List number line 2</li></ol></div>';
		let indentation = '<div>Indentation</div>';
		let textAlignmentLeft = '<div>Text alignment Left</div>';
		let textAlignmentCenter = '<div style="text-align: center;">Text alignment Center</div>';
		let textAlignmentRight = '<div><div style="text-align: right;">Text alignment Right</div>';
		let linkHref = 'href="http://google.ca"';
		let linkRel = 'rel="noreferrer noopener"';
		let linkTarget = 'target="_blank"';
		let linkString = 'Link';
		let emoji = 'alt="😀"';
		let mailBodyHTML = '<div><font ' + fontFace + ' ' + fontSize + '>' + fontStr + '</font></div>'
						+ bold + italic + underline
						+ '<p><font ' + textBackgroundColor + ' ' + textColor + '>' + textColorString + '</font></p>'
						+ listDot + listNumber + indentation + textAlignmentLeft + textAlignmentCenter + textAlignmentRight
						+ '&nbsp;<a ' + linkHref + ' ' + linkRel + ' ' + linkTarget + '>' + linkString + '</a>&nbsp;'
						+ '<p style="margin:0;"></p><div embedded-card="" id="enhanced-link-card-1"> <div style="max-width: 400px;"> <a rel="noopener noreferrer" href="http://google.ca" style="text-decoration-line: none;" target="_blank"> <div style="width: 100%;" embedded-link-card=""> <table style="width: 100%;border-collapse: collapse;"> <tbody> <tr> <td> <table style="border-collapse: collapse; border-width: 1px 1px 3px; border-style: solid; border-color: rgb(224, 228, 233) rgb(224, 228, 233) rgb(0, 0, 0); border-image: initial; display: block; position: relative; vertical-align: middle; width: 100%; background-image: initial; background-position: initial; background-size: initial; background-repeat: initial; background-color: rgb(255, 255, 255);" id="enhanced-link-card-table-1"> <tbody> <tr> <td style="vertical-align: middle; padding: 18px 20px;"> <h2 style="color: rgb(0, 0, 0); font-size: 16px; margin: 0px;"> Google </h2> <p style="color: #535353; font-size: 11px; line-height: 1.27;margin: 4px 0 0;">Happy Fourth of July! #GoogleDoodle</p> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table>  </div> </a> </div> </div><p style="margin:0;"><br></p>'
						+ '<img emoji="" ' + emoji + ' src="cid:1chiried18lg@zimbra">';
		let htmlContent = await utils.escapeXml(mailBodyHTML);
		let plainTextContent = 'Font\nBold\nItalic\nUnderline\nText color  - List dot line 1  - List dot line 2  1. List number line 1  2. List number line 2IndentationText alignment LeftText alignment CenterText alignment Right Link              Google  Happy Fourth of July! #GoogleDoodle             \n';
		let expectedPlainTextContent = 'Font Bold Italic Underline Text color - List dot line 1 - List dot line 2 1. List number line 1 2. List number line 2IndentationText alignment ...';

		await soap.sendMsgRequestHtmlContent(account.authToken, mailToAccount.emailAddress, mailSubject, plainTextContent, htmlContent);
		await common.reloadApp();

		await mail.selectFolder(folder.F_SENT);
		await mail.selectMessage(mailSubject);

		let bodyContentInnerHTML = await app.client.getHTML(mail.locators.messageContent);
		let fontInnerHTML = await utils.splitInnerHTML(bodyContentInnerHTML, fontStr, '<font', '</font>');
		let textColorInnerHTML = await utils.splitInnerHTML(bodyContentInnerHTML, textColorString, '<font', '</font>');
		let linkInnerHTML = await utils.splitInnerHTML(bodyContentInnerHTML, linkString, '<a', '</a>');
		(await utils.isSubStringPresent(fontInnerHTML, fontSize, fontFace, fontStr)).should.eql(true);
		(await utils.isSubStringPresent(bodyContentInnerHTML, bold, italic, underline, listDot, listNumber, indentation, textAlignmentLeft, textAlignmentCenter, textAlignmentRight)).should.eql(true);
		(await utils.isSubStringPresent(textColorInnerHTML, textBackgroundColor, textColor, textColorString)).should.eql(true);
		(await utils.isSubStringPresent(linkInnerHTML, linkHref, linkTarget, linkString)).should.eql(true);

		let getMailToResponse = await soap.searchAndGetMessage(mailToAccount.authToken, mailSubject, folder.F_INBOX);
		getMailToResponse.textPlain.should.contain(expectedPlainTextContent, 'Verify mail body content');
	});
});