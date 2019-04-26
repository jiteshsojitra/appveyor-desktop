import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	selected: [],
	lastUpdated: undefined,
	matches: null
};

export default handleActions(
	{
		[actionCreators.setSelection]: (state, action) => ({
			...state,
			selected: action.payload
		}),
		[actionCreators.setLastUpdated]: (state, action) => ({
			...state,
			lastUpdated: action.payload || Date.now()
		})
	},
	initialState
);
