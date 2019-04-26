import findIndex from 'lodash/findIndex';
import differenceWith from 'lodash/differenceWith';
import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	tabs: [],
	showAdvanced: false,
	searchQuery: ''
};

export default handleActions(
	{
		[actionCreators.addTab]: (state, { payload }) => {
			const index = findIndex(state.tabs, t => t.id === payload.id && t.type === payload.type);
			let tabs = [...state.tabs];
			if (index !== -1) {
				tabs.splice(index, 1, payload);
			} else {
				tabs = [...state.tabs, payload];
			}

			return {
				...state,
				tabs
			};
		},
		[actionCreators.removeTab]: (state, { payload }) => ({
			...state,
			tabs: state.tabs.filter(t => !(t.id === payload.id && t.type === payload.type))
		}),
		[actionCreators.removeTabs]: (state, { payload }) => ({
			...state,
			tabs: differenceWith(state.tabs, payload, (t1, t2) => t1.id === t2.id && t1.type === t2.type)
		}),
		[actionCreators.removeAllTabs]: state => ({
			...state,
			tabs: []
		}),
		[actionCreators.setShowAdvanced]: (state, action) => ({
			...state,
			showAdvanced: action.payload.show,
			searchQuery: action.payload.searchQuery
		})
	},
	initialState
);
