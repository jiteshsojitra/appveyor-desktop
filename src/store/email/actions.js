import { createAction } from 'redux-actions';

export const setAccount = createAction('email setAccount');

export const openModalCompose = createAction('email openModalCompose', ({ mode, message }) =>
	mode && message ? { mode, message } : true
);
export const closeCompose = createAction('email closeCompose');

export const setMailListSortBy = createAction('email setMailListSort');

export const setScroll = createAction('email setScroll');
