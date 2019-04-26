/** An isolated localStorage-backed cache created for each Zimlet.
 *  @returns {Cache} cache
 */
export default function createCache(name) {
	const storageKey = `zimletcache::${name}`;
	let data = {},
		timer;
	try {
		data = JSON.parse(localStorage.getItem(storageKey)) || {};
	} catch (e) {}
	function save() {
		localStorage.setItem(storageKey, JSON.stringify(data));
	}
	return /** @lends Cache# */ {
		/** Get a key from the cache */
		get: key => data[key],

		/** Set a cache key to the given value */
		set(key, value) {
			data[key] = value;
			clearTimeout(timer);
			timer = setTimeout(save, 50);
		}
	};
}
