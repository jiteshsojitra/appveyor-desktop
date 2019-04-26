import { handleActions } from 'redux-actions';
import array from '@zimbra/util/src/array';
import * as actionCreators from './actions';

const initialState = {
	isDragging: false,
	data: undefined
};

export default handleActions(
	{
		[actionCreators.setDragData]: (state, { payload }) => ({
			...state,
			data: array(payload)
		}),
		[actionCreators.clearDragData]: state => ({
			...state,
			data: undefined
		}),
		[actionCreators.setDragging]: (state, action) => ({
			...state,
			isDragging: Boolean(action.payload)
		})
	},
	initialState
);
