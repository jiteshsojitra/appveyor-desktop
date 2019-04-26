import { combineReducers } from 'redux';

import activeAccount from './active-account/reducer';
import attachmentPreview from './attachment-preview/reducer';
import calendar from './calendar/reducer';
import network from './network/reducer';
import trashFolder from './trash-folder/reducer';
import junkFolder from './junk-folder/reducer';
import contacts from './contacts/reducer';
import dragdrop from './dragdrop/reducer';
import email from './email/reducer';
import mail from './mail/reducer';
import mediaMenu from './media-menu/reducer';
import navigation from './navigation/reducer';
import notifications from './notifications/reducer';
import notificationModal from './notification-modal/reducer';
import settings from './settings/reducer';
import about from './about/reducer';
import sidebar from './sidebar/reducer';
import url from './url/reducer';
import search from './search/reducer';
import zimlets from './zimlets/reducer';

export default function createReducer(additionalReducers = {}) {
	return combineReducers({
		...additionalReducers,
		activeAccount,
		attachmentPreview,
		calendar,
		contacts,
		dragdrop,
		email,
		mail,
		mediaMenu,
		navigation,
		notifications,
		notificationModal,
		settings,
		about,
		sidebar,
		url,
		network,
		trashFolder,
		junkFolder,
		search,
		zimlets
	});
}
