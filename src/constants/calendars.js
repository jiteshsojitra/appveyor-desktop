export const CALENDAR_TYPE = {
	own: 'own',
	holiday: 'holiday',
	other: 'other'
};

export const CALENDAR_TYPE_LIST = [CALENDAR_TYPE.own, CALENDAR_TYPE.other];

export const CALENDAR_LIST_ORDER = {
	[CALENDAR_TYPE.own]: 0,
	[CALENDAR_TYPE.other]: 1
};

export const CALENDAR_IDS = {
	[CALENDAR_TYPE.own]: {
		DEFAULT: '10'
	}
};
export const weekDaySorter = {
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6,
	SU: 7
};

// Zimbra FolderActionRequest op='!grant' requires a `zid`
// however, `pub` and `all` require fake `zid`s.
// https://files.zimbra.com/docs/soap_api/8.7.11/api-reference/zimbraMail/FolderAction.html
export const ZIMBRA_GRANT_IDS = {
	all: '00000000-0000-0000-0000-000000000000',
	pub: '99999999-9999-9999-9999-999999999999'
};

export const ATTENDEE_ROLE = {
	optional: 'OPT',
	required: 'REQ'
};

export const PARTICIPATION_STATUS = {
	needsAction: 'NE',
	tentative: 'TE',
	accept: 'AC',
	declined: 'DE'
};

export const CALENDAR_USER_TYPE = {
	resource: 'RES'
};

export const PREF_TO_VIEW = {
	day: 'day',
	list: 'agenda',
	month: 'month',
	week: 'week',
	workWeek: 'work_week',
	year: 'year'
};

export const DAY = 24 * 60 * 60 * 1000;

export const TIMES = {
	agenda: 0,
	day: DAY,
	week: 7 * DAY,
	work_week: 5 * DAY,
	month: 31 * DAY, // (3 months = buffer)
	year: 0
};

export const SHARED_CALENDAR_PERMISSION = {
	read: 'r',
	write: 'w',
	insert: 'i',
	delete: 'd',
	administer: 'a',
	workflowAction: 'x',
	viewPrivate: 'p',
	viewFreebusy: 'f',
	createSubfolder: 'c'
};

export const CALENDAR_REPEAT_FREQUENCY = {
	none: 'NONE',
	daily: 'DAI',
	weekly: 'WEE',
	monthly: 'MON',
	yearly: 'YEA'
};
