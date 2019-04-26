const handleFetchAPIErrors = response => {
	if (!response.ok) {
		throw Error(response.statusText);
	}
	return response;
};

export function readFile(file, { readerFn = 'readAsText' } = {}) {
	return new Promise((resolve, reject) => {
		const fr = new FileReader();
		fr.onload = () => resolve(fr.result);
		fr.onerror = () => reject(fr.error);
		fr[readerFn](file);
	});
}

export function downloadFile(url, { encoding = 'x-base64', responseFormat = 'text' } = {}) {
	return fetch(url, {
		headers: {
			'X-Zimbra-Encoding': encoding
		},
		credentials: 'include'
	})
		.then(handleFetchAPIErrors)
		.then(res => res[responseFormat]());
}
