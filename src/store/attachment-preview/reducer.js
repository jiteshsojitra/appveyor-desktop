import { handleActions } from 'redux-actions';
import { circularIndex } from '../../lib/util';
import { hasAttachmentPreview } from '../../utils/attachments';
import * as actionCreators from './actions';
import findIndex from 'lodash-es/findIndex';

const initialState = {
	selected: 0,
	group: []
};

export default handleActions(
	{
		[actionCreators.setPreviewAttachment]: (state, action) => {
			let { group, attachment } = action.payload;
			if (!group && !attachment) {
				return {
					...state,
					selected: initialState.selected,
					group: initialState.group
				};
			}
			group = (group && group.filter(hasAttachmentPreview)) || state.group;
			const index = findIndex(group, g =>
				attachment.part ? g.part === attachment.part : g.base64 === attachment.base64
			);
			return {
				...state,
				group,
				selected:
					typeof attachment === 'number' ? attachment : index !== -1 ? index : state.selected
			};
		},
		[actionCreators.previewPreviousPage]: state => ({
			...state,
			selected: circularIndex(state.selected - 1, state.group.length)
		}),
		[actionCreators.previewNextPage]: state => ({
			...state,
			selected: circularIndex(state.selected + 1, state.group.length)
		})
	},
	initialState
);
