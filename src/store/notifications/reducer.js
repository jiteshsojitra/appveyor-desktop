import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	notification: null
};

export default handleActions(
	{
		[actionCreators.notify]: (state, action) => ({
			...state,
			notification: action.payload
		}),
		[actionCreators.clear]: state => ({
			...state,
			notification: null
		})
	},
	initialState
);
