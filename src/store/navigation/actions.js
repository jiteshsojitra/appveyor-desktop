import { createAction } from 'redux-actions';

export const addTab = createAction('navigation add.tab');
export const removeTab = createAction('navigation remove.tab');
export const removeTabs = createAction('navigation remove.tabs');
export const removeAllTabs = createAction('navigation remove.allTabs');
export const setShowAdvanced = createAction('navigation set.showAdvanced');
