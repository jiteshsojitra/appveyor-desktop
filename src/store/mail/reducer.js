import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	selectedIds: new Set()
};

export default handleActions(
	{
		[actionCreators.clearSelected]: state =>
			!state.selectedIds.size
				? state
				: {
						...state,
						selectedIds: new Set()
				  },
		[actionCreators.setSelected]: (state, action) => ({
			...state,
			selectedIds: new Set(state.selectedIds.add(action.payload.item))
		}),
		[actionCreators.toggleSelected]: (state, action) => {
			const { item, e } = action.payload;
			return {
				...state,
				selectedIds: e.target.checked
					? new Set(state.selectedIds.add(item))
					: new Set(Array.from(state.selectedIds).filter(i => i.id !== item.id))
			};
		},
		[actionCreators.toggleAllSelected]: (state, action) => ({
			...state,
			selectedIds: state.selectedIds.size === 0 ? new Set(action.payload.items) : new Set()
		})
	},
	initialState
);
