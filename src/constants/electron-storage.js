export default typeof process.env.ELECTRON_ENV !== 'undefined' &&
	function(path) {
		const storage = {};
		return import('electron-json-storage').then(_storage => {
			const dataPath = path ? path : _storage.getDefaultDataPath();
			storage.clear = _storage.clear.bind(_storage, { dataPath });

			storage.keys = () =>
				new Promise((resolve, reject) => {
					_storage.keys({ dataPath }, (err, keys) => (err ? reject(err) : resolve(keys)));
				});

			storage.getItem = key =>
				new Promise((resolve, reject) => {
					// NOTE: `electron-json-storage` returns an empty object instead of null
					// when it cannot find items in storage.
					_storage.get(key, { dataPath }, (err, data) =>
						err ? reject(err) : resolve(typeof data === 'string' ? data : null)
					);
				});

			storage.setItem = (key, value) =>
				new Promise((resolve, reject) => {
					_storage.set(key, value, { dataPath }, err => (err ? reject(err) : resolve()));
				});

			storage.removeItem = key =>
				new Promise((resolve, reject) => {
					_storage.remove(key, { dataPath }, err => (err ? reject(err) : resolve()));
				});

			return storage;
		});
	};
