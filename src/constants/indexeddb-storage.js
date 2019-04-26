import { get, set, keys, del, clear } from 'idb-keyval';

export default {
	clear() {
		return clear();
	},
	getItem(key) {
		return get(key);
	},
	setItem(key, value) {
		return set(key, value);
	},
	keys() {
		return keys();
	},
	remove(key) {
		return del(key);
	},
	removeItem(key) {
		return del(key);
	}
};
