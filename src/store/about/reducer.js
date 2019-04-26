import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	visible: false
};

export default handleActions(
	{
		[actionCreators.toggle]: state => ({
			...state,
			visible: !state.visible
		})
	},
	initialState
);
