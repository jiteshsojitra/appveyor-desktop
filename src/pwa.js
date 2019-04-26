import runtime from 'offline-plugin/runtime';

const runtimeInstall = onUpdatedCallback => {
	runtime.install({
		// When an update is ready, tell ServiceWorker to take control immediately:
		onUpdateReady() {
			runtime.applyUpdate();
		},

		// Reload to get the new version:
		onUpdated() {
			onUpdatedCallback();
		}
	});
};

export default runtimeInstall;
