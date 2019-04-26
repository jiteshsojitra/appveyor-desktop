export default function getApplicationStorage(path) {
	return typeof process.env.ELECTRON_ENV !== 'undefined'
		? import('./electron-storage').then(({ default: fn }) => fn(path))
		: import('./indexeddb-storage').then(({ default: d }) => d);
}

export function getApplicationStorageMaxSize() {
	// Max size is unlimited in electron (using electron-json-storage), 7.5 MB in Web
	return process.env.ELECTRON_ENV ? false : Math.pow(2, 20) * 7.5;
}

export function getApplicationStorageUsedSize(persistor, percentage = true) {
	return persistor.getSize().then(size => {
		const maxSize = getApplicationStorageMaxSize();

		if (!maxSize && percentage) {
			return 0;
		}

		return percentage ? ((size / maxSize) * 100).toFixed() : size;
	});
}
