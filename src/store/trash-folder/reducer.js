import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	folderInfo: {}
};

export default handleActions(
	{
		[actionCreators.setTrashFolder]: (state, action) => ({
			...state,
			folderInfo: action.payload
		})
	},
	initialState
);
