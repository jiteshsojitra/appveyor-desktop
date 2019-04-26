export default function saveAs({ url, base64, filename, type: contentType }) {
	if (typeof url === 'string') {
		// Hack for https://bugzilla.mozilla.org/show_bug.cgi?id=1237226
		//   If the URL responds with `Content Disposition: inline;` Firefox
		//   will not download the resource.
		if (/\/service\/home\/(?!.*\?.*disp=a)/i.test(url)) {
			url += `${url.indexOf('?') === -1 ? '?' : '&'}disp=a`;
		}
	} else if (typeof process.env.ELECTRON_ENV !== 'undefined' && base64) {
		// In case we receive `base64` data, we create in-memory file and then, upon confirmation, save it to the hard disk.
		const base64ToArrayBuff = Buffer.from(base64, 'base64');
		const inMemoryFile = new File([base64ToArrayBuff], filename, {
			type: contentType
		});

		url = URL.createObjectURL(inMemoryFile);
	} else {
		// Blob support for other scenarios.
		url = URL.createObjectURL(url);
	}

	startAttachmentDownloadProcess(url, filename);
}

export function startAttachmentDownloadProcess(resourceURL, resourceName) {
	const link = document.createElement('a');

	if ('download' in link) {
		link.href = resourceURL;
		link.download = resourceName;

		link.dispatchEvent(new MouseEvent('click', { view: window }));
	} else {
		// fallback, open resource in new tab.
		window.open(resourceURL, '_blank', '');
	}
}
