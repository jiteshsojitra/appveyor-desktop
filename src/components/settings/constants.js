import find from 'lodash-es/find';
import get from 'lodash/get';
import uniq from 'lodash-es/uniq';
import { weekdays } from 'moment-timezone';
import { FONT_FAMILY, FONT_SIZE } from '../../constants/fonts';
import { groupMailBy } from '../../constants/user-prefs';
import {
	groupByList,
	multitasking,
	SMIMEDefaultSetting,
	SEND_READ_RECEIPT
} from '../../constants/mailbox-metadata';
import { empty, getDayNumber } from '../../lib/util';
import { parse as parseDate, format as formatDate } from '../../utils/date/zimbra-date';
import ViewingEmailSettings from './viewing-email-settings';
import WritingEmailSettings from './writing-email-settings';
import AccountsSettings from './accounts-settings';
import SignaturesSettings from './signatures-settings';
import BlockedAddressesSettings from './blocked-addresses-settings';
import OfflineModeSettings from './offline-mode-settings';
import SecurityAndActivitySettings from './security-and-activity-settings';
import CalendarAndRemindersSettings from './calendar-and-reminders-settings';
import { soapTimeToJson, jsonTimeToSoap } from '../../utils/prefs';
import FiltersSettings from './filters-settings';
import VacationResponseSettings from './vacation-response-settings';
import { CALENDAR_IDS, CALENDAR_TYPE } from '../../constants/calendars';
import SMimeAndEncryption from './smime-and-encryption';
import { isSMIMEFeatureAvailable } from '../../utils/license';
import AccountRecoverySettings from './account-recovery-settings';
import ZimletsSettings from './zimlets-settings';
import { SMIME_OPERATIONS } from '../../constants/smime';
import { WEBCLIENT_OFFLINE_BROWSER_KEY } from '../../constants/offline';
import { DEFAULT_INTERVAL } from '../../constants/mail';
import { convertToSeconds } from '../../utils/mail-polling';

/**
 * The types of fields that can be updated by settings
 * @typedef {string} {FieldType}
 * @enum {FieldType}
 */
export const FIELD_TYPES = {
	MAILBOX_METADATA: 'mailboxMetadata',
	USER_PREF: 'userPref',
	WHITE_BLACK_LIST: 'whiteBlacklist',
	FILTER_RULES: 'filterRules',
	ZIMLET_PREFS: 'zimletPrefs'
};

/**
 * Methods for getting field values from props and saving field types back to the server.
 * @typedef {Object} {FieldTypeMethod}
 * @property {Function} selector - Calculate the current value of settings for a given key
 * @property {Function} updateAction - Save the updated settings back to the server.
 */
export const FIELD_TYPE_METHODS = {
	[FIELD_TYPES.MAILBOX_METADATA]: {
		selector: (state, key, ownProps) => get(ownProps, `mailboxMetadata.${key}`),
		updateAction: (newMailboxMetaData, { setMailboxMetadata }) =>
			setMailboxMetadata(newMailboxMetaData)
	},
	[FIELD_TYPES.USER_PREF]: {
		selector: (state, key, ownProps) => get(ownProps, `accountInfo.prefs.${key}`),
		updateAction: (prefs, { modifyPrefs }) => modifyPrefs(prefs)
	},
	[FIELD_TYPES.WHITE_BLACK_LIST]: {
		selector: (state, key, ownProps) => {
			const list = get(ownProps, 'whiteBlackList.blackList.0.addr');

			if (!list) return [];
			return list.map(addr => addr._content);
		},
		updateAction: ({ blackList }, { updateBlackList }) => updateBlackList(uniq(blackList))
	},
	[FIELD_TYPES.FILTER_RULES]: {
		selector: (state, key, ownProps) => get(ownProps, 'filters.data'),
		updateAction: ({ filterRules }, { modifyFilterRules }) => modifyFilterRules(filterRules)
	},
	[FIELD_TYPES.ZIMLET_PREFS]: {
		selector: (state, key, ownProps) => {
			const zimletsData = get(ownProps, 'accountInfo.zimlets.zimlet');

			if (!zimletsData) return null;

			return zimletsData
				.filter(zimlet => zimlet.zimlet[0].zimbraXZimletCompatibleSemVer !== null)
				.map(zimlet => ({
					name: zimlet.zimlet[0].name,
					label: zimlet.zimlet[0].label,
					presence: zimlet.zimletContext[0].presence
				}));
		},
		updateAction: ({ zimletPrefs }, { modifyZimletPrefs }) =>
			modifyZimletPrefs(
				zimletPrefs
					.filter(zimlet => zimlet.presence !== 'mandatory')
					.map(zimlet => ({
						name: zimlet.name,
						presence: zimlet.presence
					}))
			)
	}
};

/**
 * Create an entry used by settings menu to retrieve/save individual settings.
 * @typedef {Object} FieldConfig
 * @property {FieldType} type
 * @property {String} key
 * @property {*} defaultValue
 * @property {Function} toJS
 * @property {Function} fromJS
 */
const fieldConfig = (type, key, defaultValue, toJS, fromJS) => ({
	type,
	key,
	defaultValue,
	toJS,
	fromJS
});
const userPref = (zimbraUserPref, defaultValue, toJS, fromJS) =>
	fieldConfig(FIELD_TYPES.USER_PREF, zimbraUserPref, defaultValue, toJS, fromJS);
const mailboxMetadata = (zimbraMailboxMetadata, defaultValue, toJS, fromJS) =>
	fieldConfig(FIELD_TYPES.MAILBOX_METADATA, zimbraMailboxMetadata, defaultValue, toJS, fromJS);
const whiteBlackList = listType => fieldConfig(FIELD_TYPES.WHITE_BLACK_LIST, listType, []);
const filterRules = () => fieldConfig(FIELD_TYPES.FILTER_RULES, 'filterRules', []);

const zimletPrefs = () => fieldConfig(FIELD_TYPES.ZIMLET_PREFS, 'zimletPrefs', []);

export const VIEWING_EMAIL_SETTINGS = {
	id: 'viewingEmail',
	component: ViewingEmailSettings,
	fields: {
		messageListsEnableConversations: userPref(
			groupMailBy.name,
			groupMailBy.default,
			val => val === groupMailBy.values.conversation,
			val => (val ? groupMailBy.values.conversation : groupMailBy.values.message)
		),
		messageListsShowSnippets: userPref('zimbraPrefShowFragments', true),
		messageListsGroupByList: mailboxMetadata(
			groupByList.name,
			groupByList.values.date,
			val => val === groupByList.values.date,
			val => (val ? groupByList.values.date : groupByList.values.none)
		),
		// New preference, not supported in old client.
		multitasking: mailboxMetadata('zimbraPrefMultitasking', multitasking.default),
		previewPane: userPref('zimbraPrefReadingPaneLocation', 'right'),
		// New preference, not supported in old client.
		messageListDensity: mailboxMetadata('zimbraPrefMessageListDensity', 'regular'),
		markAsRead: userPref('zimbraPrefMarkMsgRead', 0, Number, Number),
		mailPollingInterval: userPref(
			'zimbraPrefMailPollingInterval',
			DEFAULT_INTERVAL,
			pollInterval => convertToSeconds(pollInterval) // This is done because by default, server returns time as '5m' (5 minutes) or '1d' and so on..
		),
		sendReadReceipt: userPref('zimbraPrefMailSendReadReceipts', SEND_READ_RECEIPT.values.prompt),
		afterMoveMessage: userPref('zimbraPrefMailSelectAfterDelete', 'adaptive'),
		enableDesktopNotifications: userPref('zimbraPrefMailToasterEnabled', true),
		mailVersion: userPref('zimbraPrefClientType', 'advanced')
	}
};
export const WRITING_EMAIL_SETTINGS = {
	id: 'writingEmail',
	component: WritingEmailSettings,
	fields: {
		whenSendingMessageAddToContacts: userPref('zimbraPrefAutoAddAddressEnabled', true),
		whenSendingMessageGenerateLinkPreviews: mailboxMetadata('zimbraPrefGenerateLinkPreviews', true),
		undoSendEnabled: mailboxMetadata('zimbraPrefUndoSendEnabled', false),
		delegatedSendSaveTarget: userPref('zimbraPrefDelegatedSendSaveTarget', 'owner'),
		requestReadReceipt: userPref('zimbraPrefMailRequestReadReceipts', false),
		// Stores different values than those stored by the old client, interop is not supported.
		// API enforces an 80 char limit, so we persist the font label instead of the value.
		defaultRichTextFont: userPref(
			'zimbraPrefHtmlEditorDefaultFontFamily',
			FONT_FAMILY[0].label,
			val => {
				const fontFamily = find(FONT_FAMILY, ({ label }) => label === val);
				if (!empty(fontFamily)) {
					return fontFamily.value;
				}
				return FONT_FAMILY[0].value;
			},
			val => {
				const fontFamily = find(FONT_FAMILY, ({ value }) => value === val);
				return fontFamily.label;
			}
		),
		// Stores different values than those stored by the old client, interop is not supported.
		defaultRichTextSize: userPref(
			'zimbraPrefHtmlEditorDefaultFontSize',
			FONT_SIZE[Math.floor(FONT_SIZE.length / 2)].value
		),
		// FIXME: determine preference key
		defaultSendingAccount: mailboxMetadata('')
	}
};
export const BLOCKED_ADDRESSES_SETTINGS = {
	id: 'blockedAddresses',
	component: BlockedAddressesSettings,
	fields: {
		blockedAddresses: whiteBlackList('blackList')
	}
};

export const OFFLINE_MODE_SETTINGS = {
	id: 'offlineMode',
	component: OfflineModeSettings,
	fields: {
		offlineBrowserKey: userPref('zimbraPrefWebClientOfflineBrowserKey', '')
	},
	afterSave: ({ localOfflineBrowserKey }) => {
		if (localOfflineBrowserKey) {
			localStorage.setItem(WEBCLIENT_OFFLINE_BROWSER_KEY, localOfflineBrowserKey);
		} else {
			localStorage.removeItem(WEBCLIENT_OFFLINE_BROWSER_KEY);
		}
	}
};

export const ACCOUNTS_SETTINGS = {
	id: 'accounts',
	component: AccountsSettings,
	fields: {
		mailForwardingAddress: userPref('zimbraPrefMailForwardingAddress'),
		mailLocalDeliveryDisabled: userPref(
			'zimbraPrefMailLocalDeliveryDisabled',
			false,
			val => val.toString(),
			val => val === 'true'
		)
	}
};

export const SIGNATURES_SETTINGS = {
	id: 'signatures',
	component: SignaturesSettings
};

export const VACATION_RESPONSE_SETTINGS = {
	id: 'vacationResponse',
	component: VacationResponseSettings,
	fields: {
		enableOutOfOfficeReply: userPref('zimbraPrefOutOfOfficeReplyEnabled', false),

		enableOutOfOfficeExternalReply: userPref('zimbraPrefOutOfOfficeExternalReplyEnabled', false),

		defaultFromDate: userPref('zimbraPrefOutOfOfficeFromDate', new Date(), parseDate, formatDate),

		defaultUntilDate: userPref('zimbraPrefOutOfOfficeUntilDate', new Date(), parseDate, formatDate),

		enableOutOfOfficeAlertOnLogin: userPref('zimbraPrefOutOfOfficeStatusAlertOnLogin', false),

		outOfOfficeReply: userPref('zimbraPrefOutOfOfficeReply', ''),
		outOfOfficeExternalReply: userPref('zimbraPrefOutOfOfficeExternalReply', ''),
		outOfOfficeSuppressExternalReply: userPref('zimbraPrefOutOfOfficeSuppressExternalReply', false)
	},
	hide: ({ accountInfoQuery }) =>
		!get(accountInfoQuery, 'accountInfo.attrs.zimbraFeatureOutOfOfficeReplyEnabled')
};

export const SECURITY_AND_ACTIVITY_SETTINGS = {
	id: 'securityAndActivity',
	component: SecurityAndActivitySettings,
	fields: {
		showImages: userPref(
			'zimbraPrefDisplayExternalImages',
			'never',
			val => val.toString(),
			val => val === 'true'
		)
	}
};

export const CALENDAR_AND_REMINDERS_SETTINGS = {
	id: 'calendarAndReminders',
	component: CalendarAndRemindersSettings,
	fields: {
		startOfWeek: userPref(
			'zimbraPrefCalendarFirstDayOfWeek',
			weekdays(0),
			val => weekdays(+val),
			val => getDayNumber(val)
		),
		timeOfDay: userPref(
			'zimbraPrefCalendarWorkingHours',
			{},
			val => soapTimeToJson(val),
			jsonTime => jsonTimeToSoap(jsonTime)
		),
		timeZone: userPref(
			'zimbraPrefTimeZoneId',
			'America/New_York',
			val => val.toString(),
			val => val
		),
		autoAddAppointmentsToCalendar: userPref('zimbraPrefCalendarAutoAddInvites', true),
		enableAppleIcalDelegation: userPref('zimbraPrefAppleIcalDelegationEnabled', false),
		defaultCalendar: userPref(
			'zimbraPrefDefaultCalendarId',
			CALENDAR_IDS[CALENDAR_TYPE.own].DEFAULT
		)
	}
};

export const FILTERS_SETTINGS = {
	id: 'filters',
	component: FiltersSettings,
	fields: {
		filters: filterRules()
	},
	hide: ({ accountInfoQuery }) =>
		!get(accountInfoQuery, 'accountInfo.attrs.zimbraFeatureFiltersEnabled')
};

export const SMIME_AND_ENCRYPTION = {
	id: 'smimeAndEncryption',
	component: SMimeAndEncryption,
	fields: {
		zimbraPrefSMIMEDefaultSetting: mailboxMetadata(
			SMIMEDefaultSetting,
			SMIME_OPERATIONS.rememberSettings
		)
	},
	hide: ({ accountInfoQuery }) =>
		!isSMIMEFeatureAvailable(get(accountInfoQuery, 'accountInfo.license'))
};

export const ACCOUNT_RECOVERY_SETTINGS = {
	id: 'accountRecovery',
	component: AccountRecoverySettings,
	hide: ({ matchesScreenXsMax, accountInfoQuery }) => {
		const passwordResetEnabled = get(
			accountInfoQuery,
			'accountInfo.attrs.zimbraFeatureChangePasswordEnabled'
		);

		return !matchesScreenXsMax || !passwordResetEnabled;
	}
};

export const ZIMLETS_SETTINGS = {
	id: 'zimlets',
	component: ZimletsSettings,
	fields: {
		zimletPrefs: zimletPrefs()
	}
};

export const SETTINGS_CONFIG = [
	VIEWING_EMAIL_SETTINGS,
	WRITING_EMAIL_SETTINGS,
	ACCOUNTS_SETTINGS,
	ACCOUNT_RECOVERY_SETTINGS,
	SIGNATURES_SETTINGS,
	VACATION_RESPONSE_SETTINGS,
	FILTERS_SETTINGS,
	BLOCKED_ADDRESSES_SETTINGS,
	OFFLINE_MODE_SETTINGS,
	SECURITY_AND_ACTIVITY_SETTINGS,
	CALENDAR_AND_REMINDERS_SETTINGS,
	SMIME_AND_ENCRYPTION,
	ZIMLETS_SETTINGS
];
