export function recentlyActiveMediaMenu(state) {
	return state.mediaMenu.activeEditors[state.mediaMenu.activeEditors.length - 1];
}
