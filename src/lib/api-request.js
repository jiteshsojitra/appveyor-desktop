function noop() {}

export default function apiRequest(origin = '', before = noop, after = noop, defaultOptions = {}) {
	return (url, body, options) => {
		options = Object.assign({}, defaultOptions, options || {});

		let req = {
			method: options.method || (body ? 'POST' : 'GET'),
			headers: options.headers || {},
			url,
			body
		};

		req = before(req) || req;

		const headers = Object.assign({}, req.headers);
		let normalizedBody = req.body;

		if (
			normalizedBody &&
			typeof normalizedBody === 'object' &&
			!(normalizedBody instanceof Blob) &&
			!(normalizedBody instanceof ArrayBuffer)
		) {
			headers['Content-Type'] = 'application/json';
			normalizedBody = JSON.stringify(normalizedBody);
		}

		let resolvedUrl = req.url;
		if (!resolvedUrl.match(/^\w+:\/\//)) {
			resolvedUrl = origin + resolvedUrl;
		}

		return fetch(resolvedUrl, {
			method: req.method,
			credentials: typeof options.credentials !== 'undefined' ? options.credentials : 'include',
			headers,
			body: normalizedBody
		}).then(res => {
			req.response = res;
			res.request = req;

			const contentType = res.headers.get('content-type');
			let type = 'text',
				parse;
			if (options.responseType) {
				type = options.responseType;
			} else if (/^(text|application)\/(javascript|json)/i.test(contentType)) {
				type = 'json';
			} else if (/xml/i.test(contentType)) {
				parse = 'xml';
				type = 'text';
			}

			return res[type]().then(resBody => {
				if (parse) {
					resBody = new DOMParser().parseFromString(resBody, 'application/xml');
				}
				const reg = /^(\d+),(['"])(^['"]+)\1,([{[])/;
				if (type === 'text' && !parse && reg.test(resBody)) {
					// @TODO maybe store the two leading properties (status,err) somewhere
					resBody = JSON.parse(resBody.replace(reg, '$4'));
				}
				res.data = resBody;
				return after(req, res) || res.data || res.body;
			});
		});
	};
}
