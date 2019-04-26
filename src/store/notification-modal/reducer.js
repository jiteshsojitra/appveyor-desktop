import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	notificationModalData: null
};

export default handleActions(
	{
		[actionCreators.showNotificationModal]: (state, action) => ({
			...state,
			notificationModalData: action.payload
		}),
		[actionCreators.closeNotifyModal]: state => ({
			...state,
			notificationModalData: null
		})
	},
	initialState
);
