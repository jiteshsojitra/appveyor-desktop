const STORAGE_NAMESPACE = `zimlets-persistance`;

export default {
	get() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_NAMESPACE)) || {};
		} catch (e) {
			return {};
		}
	},
	set(value) {
		localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(value));
	}
};
