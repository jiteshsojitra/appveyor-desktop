const mail = require('../../pages/mail');
const calendar = require('../../pages/calendar');
const utils = require('../../framework/utils');
const common = require('../../pages/common');
const button = require('../../framework/elements/button');

describe('View event', function() {
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


	it('BHR | View basic event in day, week and month view | C972887', async() => {
		let eventObject = Object.create(calendar.event);
		eventObject.eventName = `event${await utils.getUniqueString()}`;
		eventObject.startTime = '10:00AM';
		eventObject.endTime = '11:00AM';
		eventObject.invitee = (await common.createAccount()).emailAddress;
		eventObject.notes = `notes${await utils.getUniqueString()}`;
		await calendar.createBasicEvent(eventObject);

		// Verify that event has been created
		await calendar.isEventPresent(eventObject.eventName);

		// Verification on invitee's side
		await common.logoutFromClient();
		await common.loginToClient(eventObject.invitee);
		await common.navigateApp(button.B_MAIL_APP);
		await mail.isMessagePresent(eventObject.eventName).should.eventually.equal(true, 'Verify invite message is present');
		await common.navigateApp(button.B_CALENDAR_APP);

		// Verify event in day view
		await calendar.verifyEventPresentInDayView(eventObject.eventName, eventObject.startTime.split('AM')[0], eventObject.endTime.split('AM')[0]);

		// Verify event in week view
		await calendar.verifyEventPresentInWeekView(eventObject.eventName, eventObject.startTime.split('AM')[0], eventObject.endTime.split('AM')[0]);

		// Verify event in month view
		await calendar.verifyEventPresentInMonthView(eventObject.eventName, eventObject.startTime.split('AM')[0], eventObject.endTime.split('AM')[0]);
	});
});