export const FILTER_TEST_TYPE = {
	BODY: 'body',
	ADDRESS: 'address',
	HEADER: 'header'
};

export const FILTER_ACTION_TYPE = {
	FILE_INTO: 'fileInto',
	STOP: 'stop'
};

export const FILTER_CONDITION_DISPLAY = {
	FROM: 'From',
	TO_OR_CC: 'To/CC',
	SUBJECT: 'Subject',
	BODY: 'Body'
};

export const RULE_PATH_PREFIX = ['conditions', '0'];
export const RULE_ACTION_PATH = ['actions', '0', FILTER_ACTION_TYPE.FILE_INTO, '0'];

export const RULE_PREDICATE_OPTIONS = {
	MATCHES_EXACTLY: {
		label: 'matches exactly',
		update: { stringComparison: 'is', negative: false },
		value: 'MATCHES_EXACTLY'
	},
	DOES_NOT_MATCH_EXACTLY: {
		label: 'does not match exactly',
		update: { stringComparison: 'is', negative: true },
		value: 'DOES_NOT_MATCH_EXACTLY'
	},
	DOES_NOT_CONTAIN: {
		label: 'does not contain',
		value: 'DOES_NOT_CONTAIN',
		update: { stringComparison: 'contains', negative: true }
	},
	CONTAINS: {
		label: 'contains',
		value: 'CONTAINS',
		update: { stringComparison: 'contains', negative: false }
	},
	HEADER_CONTAINS: {
		label: 'contains',
		value: 'CONTAINS',
		update: { stringComparison: 'contains', negative: false }
	},
	MATCHES_WILDCARD: {
		label: 'matches wildcard condition',
		value: 'MATCHES_WILDCARD',
		update: { stringComparison: 'matches', negative: false }
	},
	DOES_NOT_MATCH_WILDCARD: {
		label: 'does not match wildcard condition',
		value: 'DOES_NOT_MATCH_WILDCARD',
		update: { stringComparison: 'matches', negative: true }
	},
	BODY_CONTAINS: {
		label: 'contains',
		value: 'BODY_CONTAINS',
		update: { negative: false }
	},
	BODY_DOES_NOT_CONTAIN: {
		label: 'does not contain',
		value: 'BODY_DOES_NOT_CONTAIN',
		update: { negative: true }
	}
};

export const NEW_FILTER_RULE = {
	name: '',
	active: true,
	actions: [
		{
			[FILTER_ACTION_TYPE.FILE_INTO]: [
				{
					index: 0,
					folderPath: 'Inbox'
				}
			],
			[FILTER_ACTION_TYPE.STOP]: [{ index: 1 }]
		}
	],
	conditions: [
		{
			allOrAny: 'allof',
			[FILTER_TEST_TYPE.ADDRESS]: [
				{
					...RULE_PREDICATE_OPTIONS.CONTAINS.update,
					index: 0,
					header: 'from',
					part: 'all',
					value: ''
				},
				{
					...RULE_PREDICATE_OPTIONS.CONTAINS.update,
					index: 1,
					header: 'to,cc',
					part: 'all',
					value: ''
				}
			],
			[FILTER_TEST_TYPE.HEADER]: [
				{
					...RULE_PREDICATE_OPTIONS.HEADER_CONTAINS.update,
					index: 2,
					header: 'subject',
					value: ''
				}
			],
			[FILTER_TEST_TYPE.BODY]: [
				{
					...RULE_PREDICATE_OPTIONS.BODY_CONTAINS.update,
					value: '',
					index: 3
				}
			]
		}
	]
};
