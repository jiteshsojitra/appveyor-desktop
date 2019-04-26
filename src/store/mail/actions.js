import { createAction } from 'redux-actions';

export const toggleSelected = createAction('mail toggle.selected');
export const toggleAllSelected = createAction('mail toggle.allSelected');
export const clearSelected = createAction('mail clearSelected');
export const setSelected = createAction('mail setSelected');
