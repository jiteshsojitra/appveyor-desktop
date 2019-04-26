import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	visible: false,
	keyboardShortcutsVisible: false
};

export default handleActions(
	{
		[actionCreators.show]: state => ({
			...state,
			visible: true
		}),
		[actionCreators.hide]: state => ({
			...state,
			visible: false
		}),
		[actionCreators.toggle]: state => ({
			...state,
			visible: !state.visible
		}),
		[actionCreators.showKeyboardShortcuts]: state => ({
			...state,
			keyboardShortcutsVisible: true
		}),
		[actionCreators.hideKeyboardShortcuts]: state => ({
			...state,
			keyboardShortcutsVisible: false
		}),
		[actionCreators.toggleKeyboardShortcuts]: state => ({
			...state,
			keyboardShortcutsVisible: !state.keyboardShortcutsVisible
		})
	},
	initialState
);
