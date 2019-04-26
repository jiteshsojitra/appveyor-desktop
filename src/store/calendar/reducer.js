import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';
import startOfDay from 'date-fns/start_of_day';

const initialState = {
	date: startOfDay(new Date()),
	activeModal: {
		modalType: null,
		modalProps: null
	}
};

export default handleActions(
	{
		[actionCreators.setDate]: (state, action) => ({
			...state,
			date: startOfDay(action.payload)
		}),
		[actionCreators.toggleModal]: (state, action) => ({
			...state,
			activeModal: action.payload
		})
	},
	initialState
);
