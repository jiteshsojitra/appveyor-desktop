const mail = require('../../pages/mail');
const calendar = require('../../pages/calendar');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const button = require('../../framework/elements/button');
const path = require('path');

describe('Create event', function () {
	this.timeout(0);
	let account = {};

	async function beforeEachTest() {
		account = await common.createAccount();
		await common.loginBeforeTestRun(account.emailAddress);
		await common.navigateApp(button.B_CALENDAR_APP);
	}

	before(async () => {
		try {
			await common.startApplication();
			utils.configChai();
		} catch (error) {
			console.log(error); // eslint-disable-line
			throw new Error('Error occurred when starting application');
		}
	});
	after(async () => {
		try {
			await common.stopApplication();
		} catch (error) {
			console.log(error); // eslint-disable-line
			throw new Error('Error occurred when closing application');
		}
	});

	beforeEach(async () => {
		try {
			await beforeEachTest();
		} catch (error) {
			console.log ("Error occured in before each: ", error); // eslint-disable-line
			await beforeEachTest();
		}
	});
	afterEach(function () {
		utils.takeScreenShotOnFailed(this.currentTest);
	});

	it('Smoke | Create basic event and send it to invitee | C972887', async () => {
		let eventObject = Object.create(calendar.event);
		eventObject.eventName = `event${await utils.getUniqueString()}`;
		eventObject.startTime = '10:00AM';
		eventObject.endTime = '11:00AM';
		eventObject.invitee = (await common.createAccount()).emailAddress;
		eventObject.notes = `notes${await utils.getUniqueString()}`;
		await calendar.createBasicEvent(eventObject);

		// Verify that the event has been created
		await calendar.isEventPresent(eventObject.eventName);
		await common.navigateApp(button.B_MAIL_APP); // So that on next login mail tab is opened by default

		await common.logoutFromClient();
		await common.loginToClient(eventObject.invitee);

		// Verification on invitee's side
		await mail.isMessagePresent(eventObject.eventName).should.eventually.equal(true, 'Verify invite message is present');
		await common.navigateApp(button.B_CALENDAR_APP);
		await calendar.selectCalendarView(button.B_WEEK_VIEW);
		await calendar.isEventPresent(eventObject.eventName).should.eventually.equal(true, 'Verify event is present in invitee calendar');
		await calendar.openEventByDoubleClick(eventObject.eventName);
		await calendar.getStartTime().should.eventually.contain('10:00', 'Verify event start time');
		await calendar.getEndTime().should.eventually.contain('11:00', 'Verify event end time');
	});


	it('BHR | Create basic event with attachment and send it to an invitee | C1743542', async () => {
		let eventObject = Object.create(calendar.event);
		eventObject.eventName = `event${await utils.getUniqueString()}`;
		eventObject.startTime = '10:00AM';
		eventObject.endTime = '11:00AM';
		eventObject.invitee = (await common.createAccount()).emailAddress;
		eventObject.notes = `notes${await utils.getUniqueString()}`;
		let fileName = 'DOC_Document.doc';
		let filePath = path.join(utils.baseDir, '/data/files/' + fileName);
		eventObject.attachment = filePath;
		await calendar.createBasicEvent(eventObject);

		// Verify that the event has been created
		await calendar.isEventPresent(eventObject.eventName);

		// Verify received message
		await common.logoutFromClient();
		await common.loginToClient(eventObject.invitee);
		await common.navigateApp(button.B_MAIL_APP);
		await mail.isMessagePresent(eventObject.eventName).should.eventually.equal(true, 'Verify invite message is present');

		// Verify event
		await common.navigateApp(button.B_CALENDAR_APP);
		await calendar.selectCalendarView(button.B_WEEK_VIEW);
		await calendar.isEventPresent(eventObject.eventName).should.eventually.equal(true, 'Verify event is present in invitee calendar');
		await calendar.openEventByDoubleClick(eventObject.eventName);
		await calendar.getStartTime().should.eventually.contain('10:00', 'Verify event start time');
		await calendar.getEndTime().should.eventually.contain('11:00', 'Verify event end time');
		await mail.isAttachmentPresent(fileName).should.eventually.equal(true, 'Verify attachment present in invite');
	});
});