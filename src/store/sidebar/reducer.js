import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	visible: false
};

export default handleActions(
	{
		[actionCreators.show]: state => ({
			...state,
			visible: true
		}),
		[actionCreators.hide]: state => ({
			...state,
			visible: false
		}),
		[actionCreators.toggle]: state => ({
			...state,
			visible: !state.visible
		})
	},
	initialState
);
