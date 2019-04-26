import { handleActions } from 'redux-actions';
import * as actionCreators from './actions';

/**
 * A buffer for data that is being injected from the media-menu.
 * To be consumed by a Component such as a text editor.
 * @property {String} action         One of: [ 'embed', 'attach' ]
 * @property {String} contentType    A mimeType for the items in the buffer. Not required for attachments.
 * @property {Object[]} data         A list of objects to be embedded or attached.
 * @example
 * // A buffer of links.
 * const buffer = { action: 'embed', contentType: 'text/uri-list', data: [{ href, title, description }] };
 *
 * // A buffer of images.
 * const buffer = { action: 'embed', contentType: 'image/*', data: [{ url, name }] };
 *
 * // A buffer of files.
 * const buffer = { action: 'attach', data: [{ contentType, size, name ] };
 */
const initialBuffer = { action: null, contentType: null, data: null };
const initialState = {
	visible: false,
	selectedTab: 0,
	activeEditors: [],
	buffer: initialBuffer
};

function craftEmbedBuffer(data) {
	return { action: 'embed', data, contentType: data && data[0] && data[0].contentType };
}

function craftAttachBuffer(data) {
	return { action: 'attach', data, contentType: data && data[0] && data[0].contentType };
}

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
		}),
		[actionCreators.selectTab]: (state, action) => ({
			...state,
			selectedTab: action.payload
		}),
		[actionCreators.embed]: (state, action) => ({
			...state,
			buffer: craftEmbedBuffer(action.payload)
		}),
		[actionCreators.attach]: (state, action) => ({
			...state,
			buffer: craftAttachBuffer(action.payload)
		}),
		[actionCreators.clearBuffer]: state => ({
			...state,
			buffer: initialBuffer
		}),
		[actionCreators.setActiveEditor]: (state, { payload: id }) => ({
			...state,
			activeEditors: [...state.activeEditors.filter(activeEditorId => activeEditorId !== id), id]
		}),
		[actionCreators.unsetActiveEditor]: (state, { payload: id }) => ({
			...state,
			activeEditors:
				state.activeEditors.indexOf(id) === -1
					? state.activeEditors
					: state.activeEditors.filter(activeEditorId => activeEditorId !== id)
		})
	},
	initialState
);
