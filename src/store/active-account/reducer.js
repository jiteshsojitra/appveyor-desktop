import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	id: null,
	authTokenExpired: false
};

export default handleActions(
	{
		[actionCreators.setActiveAccountId]: (state, action) => ({
			...state,
			id: action.payload
		}),
		[actionCreators.setAuthTokenExpired]: (state, action) => ({
			...state,
			authTokenExpired: action.payload
		})
	},
	initialState
);
