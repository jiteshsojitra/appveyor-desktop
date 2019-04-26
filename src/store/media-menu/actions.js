import { createAction } from 'redux-actions';

export const show = createAction('mediaMenu show');
export const hide = createAction('mediaMenu hide');
export const toggle = createAction('mediaMenu toggle');

export const selectTab = createAction('mediaMenu selectTab');

export const embed = createAction('mediaMenu embed');
export const attach = createAction('mediaMenu attach');
export const clearBuffer = createAction('mediaMenu clearBuffer');

export const setActiveEditor = createAction('mediaMenu setActiveEditor');
export const unsetActiveEditor = createAction('mediaMenu unsetActiveEditor');
