const utils = require('../../framework/utils');
const button = require('../../framework/elements/button');
const calendar = require('../../pages/calendar');
const common = require('../../pages/common');

describe('Create calendar folder', function() {
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
	afterEach(function() {
		utils.takeScreenShotOnFailed(this.currentTest);
	});


	it('Smoke | Create basic calendar folder | C711375', async() => {
		let calendarName = `calendar${await utils.getUniqueString()}`;
		await calendar.addCalendar(calendarName);
		await calendar.isCalendarPresent(calendarName).should.eventually.equal(true, 'Verify that created calendar is present');
		await common.reloadApp();
		await calendar.isCalendarPresent(calendarName).should.eventually.equal(true, 'Verify that created calendar is present after reload');
	});
});