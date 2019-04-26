const folder = require('../framework/elements/folder');
const app = require('../framework/app-config');
const utils = require('../framework/utils');
const button = require('../framework/elements/button');

module.exports = {

	locators: {
		calendarGroup: (groupName) => '//div[@class="zimbra-client_calendar_calendar-list_groupName"][.="' + groupName + '"]',
		calendarFolder: (calendarName) => '//label[@class="zimbra-client_calendar_calendar-list_name"][.="' + calendarName + '"]',
		addCalendarTextField: 'div.zimbra-client_calendar_create-calendar-modal_contentWrapper input[placeholder="New Calendar"]',
		addEventTextField: 'input[placeholder="Add Event"]',
		startDay: '',
		endDay: '',
		startTime: '//div[@class="zimbra-client_form-group_formGroup"]/label[.="Start"]/following-sibling::div//input[@type="time"]',
		endTime: '//div[@class="zimbra-client_form-group_formGroup"]/label[.="End"]/following-sibling::div//input[@type="time"]',
		invitee: '//label[.="Invitees"]/following-sibling::div//input[contains(@class,"zimbra-client_address-field_inputField")]',
		notes: 'textarea.zimbra-client_calendar_appointment-edit_textArea',
		attachment: 'button.zimbra-client_calendar_appointment-edit_attachmentButton span.zimbra-icon-paperclip',
		eventBubble: (eventName) => 'div.zimbra-client_calendar_event[title="' + eventName + '"] div.zimbra-client_calendar_eventInner',
		eventBubbleInMonthView: (eventName) => 'div.zimbra-client_calendar_event div[title="' + eventName + '"] div.zimbra-client_calendar_eventInner',
		eventAttachment: 'div.zimbra-client_attachment-grid_attachments',
		calendarView: (view) => '//span[@class="zimbra-client_action-button_text"][.="' + view + '"]'
	},

	event: {
		eventName: null,
		startTime: null,
		endTime: null,
		invitee: null,
		location: null,
		notes: null,
		attachment: null
	},

	async addCalendar(calendarName) {
		await app.client.moveToObject(this.locators.calendarGroup(folder.F_MY_CALENDARS))
			.click(this.locators.calendarGroup(folder.F_MY_CALENDARS) + '/following-sibling::div/span[@role="img"]');
		await app.client.setValue(this.locators.addCalendarTextField, calendarName);
		await utils.pressButton(button.B_SAVE);
		await app.client.pause(2000);
	},

	async isCalendarPresent(calendarName) {
		return await app.client.isExisting(this.locators.calendarFolder(calendarName), utils.elementExistTimeout);
	},

	async selectCalendarView(calendarView) {
		await app.client.click(this.locators.calendarView(calendarView));
		await app.client.pause(3000);
	},

	async createBasicEvent(event) {
		await utils.pressButton(button.B_NEW_EVENT);
		await app.client.setValue(this.locators.addEventTextField, event.eventName);
		if (event.startTime !== null && event.startTime) {
			await this.setStartTime(event.startTime);
		}
		if (event.endTime !== null && event.endTime) {
			await this.setEndTime(event.endTime);
		}
		if (event.invitee !== null && event.invitee) {
			await app.client.setValue(this.locators.invitee, event.invitee);
		}
		if (event.notes !== null && event.notes) {
			await app.client.setValue(this.locators.notes, event.notes);
		}
		if (event.attachment !== null && event.attachment) {
			await app.client.click(this.locators.attachment);
			await this.uploadFile(event.attachment);
		}
		await utils.pressButton(button.B_SAVE);

		if (event.invitee !== null && event.invitee) {
			await utils.pressButton(button.B_SEND);
		}
		await utils.sleep(2000);
	},

	async openEventByDoubleClick(eventName) {
		await app.client.doubleClick(this.locators.eventBubble(eventName));
		await app.client.pause(2000);
	},

	async getStartTime() {
		return app.client.getAttribute(this.locators.startTime, 'datevalue');
	},

	async getEndTime() {
		return app.client.getAttribute(this.locators.endTime, 'datevalue');
	},

	async isEventPresent(eventName) {
		return await app.client.isExisting(this.locators.eventBubble(eventName), utils.elementExistTimeout);
	},

	async verifyEventPresentInDayView(eventName, startTime, endTime) {
		await this.selectCalendarView(button.B_DAY_VIEW);
		await this.isEventPresent(eventName).should.eventually.equal(true, 'Verify the event is present in day view');
		await this.openEventByDoubleClick(eventName);
		await this.getStartTime().should.eventually.contain(startTime, 'Verify the event start time');
		await this.getEndTime().should.eventually.contain(endTime, 'Verify the event end time');
		await utils.pressButton(button.B_CANCEL);
	},

	async verifyEventPresentInWeekView(eventName, startTime, endTime) {
		await this.selectCalendarView(button.B_WEEK_VIEW);
		await this.isEventPresent(eventName).should.eventually.equal(true, 'Verify the event is present in week view');
		await this.openEventByDoubleClick(eventName);
		await this.getStartTime().should.eventually.contain(startTime, 'Verify the event start time');
		await this.getEndTime().should.eventually.contain(endTime, 'Verify the event end time');
		await utils.pressButton(button.B_CANCEL);
	},

	async verifyEventPresentInMonthView(eventName, startTime, endTime) {
		await this.selectCalendarView(button.B_MONTH_VIEW);
		await this.selectCalendarView(button.B_MONTH_VIEW);
		await app.client.isExisting(this.locators.eventBubbleInMonthView(eventName), utils.elementExistTimeout).should.eventually.equal(true, 'Verify the event is present in month view');
		await app.client.doubleClick(this.locators.eventBubbleInMonthView(eventName));
		await app.client.pause(1000);
		await this.getStartTime().should.eventually.contain(startTime, 'Verify the event start time');
		await this.getEndTime().should.eventually.contain(endTime, 'Verify the event end time');
		await utils.pressButton(button.B_CANCEL);
	},

	// Upload file
	async uploadFile(filePath) {
		await app.client.waitForExist('input[type="file"]', utils.elementExistTimeout);
		await app.client.chooseFile('input[type="file"]', filePath);
		await app.client.waitForExist(this.locators.eventAttachment, utils.elementExistTimeout);
		await app.client.pause(2000);
	},

	async setStartTime(time) {
		await app.client.addValue(this.locators.startTime, time);
		await app.client.pause(500);
	},

	async setEndTime(time) {
		await app.client.addValue(this.locators.endTime, time);
		await app.client.pause(500);
	}
};