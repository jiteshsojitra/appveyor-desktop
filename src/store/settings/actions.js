import { createAction } from 'redux-actions';

export const show = createAction('settings showSettings');
export const hide = createAction('settings hideSettings');
export const toggle = createAction('settings toggleSettings');

export const showKeyboardShortcuts = createAction('settings showKeyboardShortcuts');
export const hideKeyboardShortcuts = createAction('settings hideKeyboardShortcuts');
export const toggleKeyboardShortcuts = createAction('settings toggleKeyboardShortcuts');
