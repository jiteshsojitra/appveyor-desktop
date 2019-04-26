import get from 'lodash-es/get';
import merge from 'lodash-es/merge';
import unset from 'lodash-es/unset';

//when control keys are used, specify them in this order, + delimited
//cmd,ctrl,shift,alt
//all keys use uppercase representation
//For example, holding 'c' while pressing shift and control would be a keycode of 'ctrl+shift+C'

/*
First-level keys are the active context when the key is entered: things in 'all' are applicable regardless of where you are at in the app

Any key below that either has a value of a command id to run, or has an object value.
When there is an object value, it defines a sequence of keys that you press in order (not simultaneously) to trigger a resulting action.
A default is triggered if you are in the middle of a sequence but haven't reached a terminal state yet.

For example M U as a sequence will mark a message as unread, but M by itself will open the Move to a folder menu.
That default Move to a folder functionality triggers after the sequence timer for a sequence runs out after you have hit M and no other keys.
*/
export default function KeyToCommandBindings(initialBindings = DEFAULT_BINDINGS) {
	let bindings = { ...initialBindings };

	/**
	 * Get a copy of the bindings object
	 */
	const getBindings = () => ({ ...bindings });

	/**
	 * Get all applicable commands and sequence for a key for all applicable contexts
	 *
	 * @param {string} key
	 * @returns {object} Form of {commands: [{context, command},...], sequences: [{context, command}, ...]}.
	 */
	const getCommandsAndSequences = key =>
		Object.keys(bindings).reduce(
			(result, context) => {
				const command = get(bindings[context], key);
				if (command) {
					typeof command === 'object'
						? result.sequences.push({ context, command: command.default })
						: result.commands.push({ context, command });
				}
				return result;
			},
			{ commands: [], sequences: [] }
		);

	/**
	 * Deep merge newBindings with the existing bindings
	 * @param {Object} newBindings new bindings to be deep merged with existing bindings
	 */
	const addBindings = newBindings => {
		//deep merge with existing bindings
		merge(bindings, newBindings);
	};

	/**
	 * Deep delete the keys present in bindingsToRemove
	 *
	 * @param {string[]} bindingsToRemove an array of paths of bindings to remove, e.g. ['all.G.D', 'mail.ctrl+C']
	 */
	const removeBindings = bindingsToRemove => {
		bindingsToRemove.forEach(path => unset(bindings, path));
	};

	/**
	 * Overwrite existing bindings with new bindings
	 * @param {Object} newBindings
	 */
	const replaceBindings = newBindings => {
		bindings = { ...newBindings };
	};

	return {
		getCommandsAndSequences,
		getBindings,
		addBindings,
		removeBindings,
		replaceBindings
	};
}

const DEFAULT_BINDINGS = {
	all: {
		G: {
			M: 'GO_TO_MAIL',
			A: 'GO_TO_CONTACTS',
			C: 'GO_TO_CALENDAR',
			P: 'GO_TO_PREFERENCES'
		},
		N: {
			M: 'COMPOSE_MESSAGE',
			C: 'NEW_CONTACT'
		},
		'ctrl+Q': 'SHOW_KEYBOARD_SHORTCUTS',
		'/': 'FOCUS_SEARCH_BOX'
	},
	mail: {
		C: 'COMPOSE_MESSAGE',
		'=': 'FETCH_MAIL',
		Z: 'MARK_AS_READ',
		X: 'MARK_AS_UNREAD',
		I: 'OPEN_INBOX',
		V: {
			default: 'OPEN_FOLDER',
			I: 'OPEN_INBOX',
			D: 'OPEN_DRAFTS',
			J: 'OPEN_JUNK',
			S: 'OPEN_SENT',
			T: 'OPEN_TRASH'
		},
		M: {
			R: 'MARK_AS_READ',
			U: 'MARK_AS_UNREAD'
		},
		N: {
			default: 'COMPOSE_MESSAGE'
		},
		DELETE: 'DELETE_MESSAGES',
		BACKSPACE: 'DELETE_MESSAGES'
	}
};

/*
To be coded for All:

Ctrl+/ Focus content pane
Ctrl+Y Focus toolbar
N New item
N M Compose
C Compose
Shift+C Compose in new window
N C New contact
N A New appointment
N K New task
N L New calendar
N B New buddy
N E Add external calendar
N D New document
N T New tag
Ctrl+→ Next page
Ctrl+←Previous page
P Print
N S Open a search tab
Del Delete item(s)
Backspace Delete item(s)
Shift+Del Hard Delete item(s)
Shift+Backspace Hard Delete item(s)
Esc Close
! Quick Reminder
V Go to (visit) folder
V V Go to (visit) tag
M Move item(s)
M M Move item(s)
T Tag item(s)
U Remove tags
S Run a saved search
Ctrl+Shift+A Select all search results
Ctrl+Q Show shortcuts
Shift+/ Show shortcuts
, Show right-click menu
Ctrl+Enter Show right-click menu
Ctrl+Space Show right-click menu

To be Coded For Mail:
= Get Mail
I Inbox
V I Inbox
V D Drafts
V J Junk
V S Sent
V T Trash
Enter Open message
M R Mark read
Z Mark read
M U Mark unread
X Mark unread
M F Flag/Unflag messages
M S Report (mark as) spam.
T Move to Trash.
I Move to Inbox
R Reply
A Reply all
F Forward message
J Select next item
K Select previous item
SpaceKeep reading
[ Previous unread
] Next unread
Shift+] Last unread
Shift+[ First unread
V C Conversation view
V MMessage view
M P B Reading pane at bottom
M P R Reading pane on right
MPOTurn off reading paneQShow snippetNFNew folder

Conversation List View
→ Expand conversation
← Collapse conversation
O Expand/collapse conversation
Shift+O Expand all loaded conversations
Ctrl+OCollapse all conversationsCtrl+[Select previous unread messageCtrl+]Select next unread messageShift+Ctrl+[Select first unread messageShift+Ctrl+]Select last unread message

Compose
Ctrl+EnterSendEscCancelCtrl+SSave draftCtrl+MAdd attachmentCtrl+GSearch for addressesCtrl+HHTML/text formatCtrl+XSpellcheckCtrl+QShow shortcuts

Address Bubble
DelDelete selected addressesBackspaceDelete selected addresses→Select next address←Select previous address

Quick reply (conversation view only)
Ctrl+EnterSendEscCancel

Conversation View
Shift+→Next conversationShift+←Previous conversation

Address Book
EEditPAPrint address book

Edit Contact
Ctrl+SSaveEscCancel

Calendar
EnterOpen appointmentEEdit appointmentQQuick appointment creationRRefreshYGo to todayDDay view1Day viewWWeek view7Week viewWWWork week view5Work week viewMMonth view3Month viewLList view9List viewEscCloseCtrl+→Next pagePage DownNext pageCtrl+←Previous pagePage UpPrevious page→Next day←Previous day↓Next appointment↑Previous appointment

Edit Appointment
Ctrl+SSaveEscCancelCtrl+HHTML/text formatCtrl+QShow shortcuts

View Appointment
EscClose

Preferences
Ctrl+SSave

Tasks
MCMark completedMUMark not completedMPBReading pane at bottomMPRReading pane on rightMPOTurn off reading pane.TMove to Trash

Edit Task
Ctrl+SSaveEscCancel

Briefcase
MPBReading pane at bottomMPRReading pane on rightMPOTurn off reading pane

Buttons
EnterPress the buttonSpacePress the button,Display menuCtrl+EnterDisplay menuCtrl+SpaceDisplay menu↓Display menu

Pop-up Menus
↓Next item↑Previous itemAlt+↑Scroll up one pageAlt+↓Scroll down one pageEnterSelectSpaceSelectEscDismiss→Show sub-menu←Hide sub-menu

Lists
↓Select next itemSpaceSelect next itemJSelect next item↑Select previous itemKSelect previous itemPageUpScroll up one pageAlt+↑Scroll up one pagePageDownScroll down one pageAlt+↓Scroll down one pageCtrl+ASelect allHomeSelect first itemCmd+↑Select first itemEndSelect last itemCmd+↓Select last itemCtrl+`Select/UnselectEnterDouble-clickShift+↓Add next itemShift+↑Add previous itemCtrl+↓Focus next itemCtrl+↑Focus previous item,Display menuCtrl+EnterDisplay menuCtrl+SpaceDisplay menu

Trees
↓Next item↑Previous item→Expand←CollapseHomeSelect first itemCmd+↑Select first itemEndSelect last itemCmd+↓Select last itemEnterSelect (in drop-down),Display menuCtrl+EnterDisplay menuCtrl+SpaceDisplay menu

Dialog Boxes
EnterSave changesSpaceSave changesEscCancel changesYRespond "Yes"NRespond "No"

Toolbars
→Next button←Previous button
*/
