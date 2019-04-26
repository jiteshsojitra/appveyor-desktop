import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

const initialState = {
	modals: {}
};

/**
 * Allows zimlets to implement modals even if the original zimlet is very small
 * It gets around issue of onClickOutside being triggered even when clicking in modal
 * by any modal added here being displayed at base app level instead of inside the zimlet
 */

export default handleActions(
	{
		/**
		 * Adds modal to base app
		 * @param {id} payload.id			the id of the modal, for use when removing
		 * @param {modal} payload.modal		the modal to be displayed
		 */
		[actionCreators.addModal]: (state, { payload }) => ({
			...state,
			modals: {
				...state.modals,
				[payload.id]: payload.modal
			}
		}),

		/**
		 * Removes modal from base app based on id
		 * @param {id} payload.id			the id of the modal to be removed
		 */
		[actionCreators.removeModal]: (state, { payload }) => {
			const modals = { ...payload.modals };
			delete modals[payload.id];
			return {
				...state,
				modals
			};
		}
	},
	initialState
);
