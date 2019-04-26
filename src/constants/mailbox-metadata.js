export const groupByList = {
	name: 'zimbraPrefGroupByList',
	values: {
		date: '2:GROUPBY_DATE',
		none: '2:GROUPBY_NONE',
		size: '2:GROUPBY_SIZE' // legacy, unused
	}
};

export const multitasking = {
	name: 'zimbraPrefMultitasking',
	values: {
		tabs: 'tabs',
		recent: 'recent'
	},
	default: 'tabs'
};

export const SEND_READ_RECEIPT = {
	name: 'zimbraPrefMailSendReadReceipts',
	values: {
		prompt: 'prompt',
		always: 'always',
		never: 'never'
	}
};

export const SMIMEDefaultSetting = 'zimbraPrefSMIMEDefaultSetting';
export const SMIMELastOperation = 'zimbraPrefSMIMELastOperation';

export const DEFAULT_MAILBOX_METADATA_SECTION = 'zwc:implicit';
export const ARCHIVE_MAILBOX_METADATA_SECTION = 'zwc:archiveZimlet';

export const ReadingPaneSashHorizontalDefault = 50;
export const ReadingPaneSashVerticalDefault = 50;
export const MailListPaneMinShrinkThreshold = 20;
export const MailListPaneMaxGrowthThreshold = 85;
