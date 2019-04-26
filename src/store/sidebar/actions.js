import { createAction } from 'redux-actions';

export const show = createAction('sidebar showSidebar');
export const hide = createAction('sidebar hideSidebar');
export const toggle = createAction('sidebar toggleSidebar');
