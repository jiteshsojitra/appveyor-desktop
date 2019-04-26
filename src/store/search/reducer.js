import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	query: '',
	activeFolder: null
};

export default handleActions(
	{
		[actionCreators.searchList]: (state, action) => ({
			...state,
			query: action.payload
		}),
		[actionCreators.setActiveSearch]: (state, action) => ({
			...state,
			activeFolder: action.payload
		})
	},
	initialState
);
