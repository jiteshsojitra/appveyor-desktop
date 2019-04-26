import { handleActions } from 'redux-actions';
import { DEFAULT_SORT } from '../../constants/search';
import * as actionCreators from './actions';

const initialState = {
	account: undefined,
	compose: undefined,
	sortBy: DEFAULT_SORT,
	fit: typeof window !== 'undefined' ? window.innerWidth <= 480 : true,
	images: true,
	mailbox: {
		metadata: {}
	},
	scroll: {}
};

export default handleActions(
	{
		[actionCreators.setAccount]: (state, action) => ({
			...state,
			account: action.payload
		}),
		[actionCreators.openModalCompose]: (state, action) => ({
			...state,
			compose: action.payload
		}),
		[actionCreators.closeCompose]: state => ({
			...state,
			compose: null
		}),
		[actionCreators.setMailListSortBy]: (state, action) => ({
			...state,
			sortBy: action.payload
		}),
		[actionCreators.setScroll]: (state, action) => ({
			...state,
			scroll: action.payload
		})
	},
	initialState
);
