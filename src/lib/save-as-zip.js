import { startAttachmentDownloadProcess } from './save-as';

export default function saveAsZip(attachments) {
	if (attachments.length) {
		import(/* webpackMode: "lazy", webpackChunkName: "jszip" */ 'jszip').then(
			({ default: JSZip }) => {
				const jsZip = new JSZip();

				attachments.forEach(({ url, base64, filename }) => {
					if (url) {
						// If `url` is present, that attachment is hosted somewhere, so we download content first and then pass it to `jsZip`.
						// Here, `jsZip` will take care of `Promise` execution.
						jsZip.file(
							filename,
							fetch(url)
								.then(res => res.blob())
								.catch(() => {})
						);
					} else if (base64) {
						// For `base64` data, we can direclty add it to `jsZip`.
						jsZip.file(filename, base64, { base64: true });
					}
				});

				// `jsZip` will complete any pending `Promises`, and at the end, creates `in-memory` `zip` representation which can be then downloaded.
				jsZip.generateAsync({ type: 'blob' }).then(zipFileContent => {
					startAttachmentDownloadProcess(URL.createObjectURL(zipFileContent), 'attachments.zip');
				});
			}
		);
	}
}
