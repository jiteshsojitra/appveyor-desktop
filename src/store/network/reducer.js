import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	isOffline: false,
	pendingSyncCount: 0,
	// Set to true when the App is syncing offline changes back to the server
	isSyncInProgress: false
};

export default handleActions(
	{
		[actionCreators.offlineConnectionStatus]: (state, action) => ({
			...state,
			isOffline: action.payload
		}),
		[actionCreators.setSyncInProgress]: (state, action) => {
			const count = action.payload
				? state.pendingSyncCount + 1
				: state.pendingSyncCount > 0
				? state.pendingSyncCount - 1
				: 0;
			return {
				...state,
				pendingSyncCount: count,
				isSyncInProgress: count > 0
			};
		}
	},
	initialState
);
