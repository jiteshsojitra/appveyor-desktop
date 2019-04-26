// eslint-disable-next-line no-unused-vars
export default function zimletsCompat({ zimlets, store, zimbra, zimbraOrigin }) {
	const compat = {};

	compat.isCompatZimlet = function isCompatZimlet(name, config) {
		// All zimlets are currently compat zimlets.
		return !(parseFloat(config.zimletsVersion) >= 2);
	};

	compat.getGlobals = function getGlobals(context) {
		return createApi(context);
	};

	return compat;
}

function createApi(context) {
	// @TODO switch this to use __zimletContext
	ZmZimletBase.PROXY = context.zimbraOrigin + '/service/proxy';

	const api = {
		appCtxt: {
			cacheSet: context.cache.set,
			cacheGet: context.cache.get,
			get: key => context.getAccount().attrs[key],
			getActiveAccount: () => context.getAccount().id,
			getUploadDialog(...args) {
				// @TODO
				console.warn('getUploadDialog()', args);
			},
			getViewTypeFromId(id) {
				// @TODO how can this possible by generic
				return id;
			}
		},
		ZmId,
		ZmSetting,
		ZmZimletBase,
		ZmMetaData,
		ZmMimeTable,
		ZmController,
		ZmObjectManager,
		ZmListController,
		AjxPackage,
		AjxDispatcher,
		AjxCallback,
		AjxUtil,
		AjxStringUtil,
		AjxTemplate,
		AjxRpc,
		DwtComposite,
		DwtControl,
		DwtToolBarButton,
		DwtListView,
		DwtTabViewPage,
		DwtDialog,
		ZmListView,
		ZmButtonToolBar,
		ZmDialog
	};

	context.API = api;
	const props = { __zimletContext: context };

	for (const i in api) {
		if (api.hasOwnProperty(i)) {
			api[i] = clone(api[i], props);
		}
	}

	return api;
}

/* eslint-disable no-inner-declarations, prefer-rest-params */

function clone(obj, props) {
	if (typeof obj === 'function') {
		function cloned() {
			return obj.apply(this, arguments);
		}
		function F() {}
		F.prototype = obj.prototype;
		cloned.prototype = new F();
		cloned.prototype.constructor = cloned;
		Object.assign(cloned.prototype, props);
		return cloned;
	} else if (obj != null && typeof obj === 'object') {
		return Object.assign({}, obj, props);
	}
}

class ZmZimletBase {
	xmlObj(key) {
		const ctx = this.__zimletContext || {};
		return key != null ? ctx[key] : ctx;
	}

	getMessage(key) {
		const properties = this.xmlObj('properties');
		if (properties) return properties[key];
	}

	getConfig(value) {
		const { config } = this.xmlObj();
		// console.log('getting config prop ' + value, config[value]);
		return config[value];
	}

	// returns an addressable URL for a given zimlet file
	// @TODO there is likely a pattern for these
	getResource(filename) {
		const opts = this.xmlObj();
		if (opts.getResourceUrl) {
			const url = opts.getResourceUrl(filename);
			if (url != null) return url;
		}
		return (opts.zimbraOrigin || '') + (opts.resourceUrl || '') + filename;
	}
}

function find(arr, key, value) {
	if (arr)
		for (let i = 0; i < arr.length; i++) {
			if (arr[i][key] === value) return arr[i];
		}
}

class AjxResponse {
	constructor(data) {
		this._data = data;
	}
	getResponse() {
		return this.data;
	}
}

class ZmMetaData {
	constructor(id) {
		this.id = id;
	}
	get(key, value, successCallback, errorCallback) {
		const account = this.__zimletContext.getAccount();
		const ident = find(account && account.identities, 'id', this.id);
		if (ident) return successCallback(new AjxResponse([{ meta: ident }]));
		errorCallback(value);
	}
	set(key, value, successCallback, errorCallback) {
		const account = this.__zimletContext.getAccount();
		const ident = find(account && account.identities, 'id', this.id);
		if (ident) {
			ident._attrs[key] = value;
			// @TODO save? ..
			return successCallback(ident._attrs);
		}
		errorCallback();
	}
}

const ZmId = {
	VIEW_MSG: 'VIEW_MSG'
};

const ZmSetting = {
	MAIL_ENABLED: 'zimbraFeatureMailEnabled'
};

const ZmMimeTable = {
	_table: {
		'*': true
	}
};

const ZmObjectManager = deprecatedClass('ZmObjectManager');
const ZmController = deprecatedClass('ZmController');
const ZmListController = deprecatedClass('ZmListController');

const AjxUtil = {
	toArray(obj) {
		if (!Array.isArray(obj)) return [].concat(obj);
		return obj;
	},
	arrayContains: (arr, key) => arr.indexOf(key) !== -1,
	arrayAsHash(arr, value) {
		if (typeof value !== 'function') value = Object.bind(null, value);
		const out = {};
		for (let i = 0; i < arr.length; i++) {
			const val = arr[i];
			out[val] = value(val, out, i, arr);
		}
		return out;
	}
};

const AjxDispatcher = {
	run(id) {
		return this.__zimletContext.controllers[id]();
	},
	addPackageLoadFunction(...args) {
		const pkg = this.__zimletContext.API.AjxPackage.current;
		console.warn('addPackageLoadFunction()', pkg, args);
	}
};

class AjxCallback {
	constructor(context, method) {
		this.context = context;
		this.method = method;
	}
	invoke(...args) {
		return this.method.apply(this.context, args);
	}
}

const AjxStringUtil = {
	urlComponentEncode: encodeURIComponent,
	urlComponentDecode: decodeURIComponent
};

const AjxTemplate = {
	registry: {},
	register(name, builder, params, replace) {
		AjxTemplate.registry[name] = { builder, params, replace };
	},
	getTemplate(name) {
		const template = AjxTemplate.registry[name];
		if (template != null) return template.builder;
	},
	getParams(name) {
		const template = AjxTemplate.registry[name];
		if (template != null) return template.params;
	}
};

let counter = 0;

const AjxRpc = {
	// @TODO timeout
	invoke(body, url, headers, callback, method, timeout) {
		const id = ++counter,
			ctx = this.__zimletContext,
			zimbraOrigin = ctx.zimbraOrigin || '';

		if (zimbraOrigin && !url.match(/^([a-z]+:)?\/\//) && url.indexOf(zimbraOrigin) !== 0) {
			url = zimbraOrigin + '/' + url.replace(/^\//g, '');
		}

		if (callback == null) {
			console.warn('Synchronous networking is deprecated and will be removed.');

			let xhr, error;
			try {
				xhr = new XMLHttpRequest();
				xhr.open(method, url, false);
				xhr.send(body);
			} catch (err) {
				error = err;
			}
			return normalizeResponse(xhr, error, id);
		}

		fetch(url, {
			method,
			headers,
			timeout
		})
			.then(res =>
				res.text().then(responseText => {
					res.responseText = responseText;
					return res;
				})
			)
			.then(res => {
				callback(normalizeResponse(res, id));
			})
			.catch(err => {
				callback(normalizeResponse(null, err, id));
			});
	}
};

function normalizeResponse(res, error, id) {
	return {
		text: res && res.responseText,
		xml: res && (res.responseXML || parseXml(res.responseText)),
		success: error ? false : res.status > 0 && res.status < 400,
		status: res ? res.status : 0,
		reqId: id
	};
}

function parseXml(text) {
	try {
		return new DOMParser().parseFromString(text, 'application/xml');
	} catch (e) {}
}

function invoke(callback, ...args) {
	if (typeof callback === 'function') callback(...args);
	else if (callback && callback.invoke) callback.invoke(...args);
}

const AjxPackage = {
	stack: [],
	current: null,
	define(name) {
		this.current = name;
		this.stack.push(name);
	},
	undefine(name) {
		if (this.current === name) {
			this.stack.pop();
			this.current = this.stack[this.stack.length - 1];
		} else {
			const index = this.stack.indexOf(name);
			if (index !== -1) {
				this.stack.splice(index, 1);
			}
		}
	},
	require({ name, callback, forceReload = false }) {
		const deps = [].concat(name);
		// @TODO forceReload should skip cache
		if (forceReload === true) {
		}
		Promise.all(deps.map(this._fetchDep)).then(resolved => {
			invoke(callback, resolved);
		});
	},
	_fetchDep(name) {
		console.warn('Dynamic dependency resolution is not supported: ' + name);
		Promise.resolve({ name });
	}
};

const DwtComposite = deprecatedClass('DwtComposite');
const DwtControl = deprecatedClass('DwtControl');
const DwtToolBarButton = deprecatedClass('DwtToolBarButton');
const DwtListView = deprecatedClass('DwtListView');
const DwtTabViewPage = deprecatedClass('DwtTabViewPage');
const DwtDialog = deprecatedClass('DwtDialog');

const ZmListView = deprecatedClass('ZmListView');
const ZmButtonToolBar = deprecatedClass('ZmButtonToolBar');
const ZmDialog = deprecatedClass('ZmDialog');

function deprecatedClass(name) {
	function f(...args) {
		console.warn(`Deprecated Zimlet class "${name}" constructed.`, args);
	}
	f.displayName = name;
	return f;
}
