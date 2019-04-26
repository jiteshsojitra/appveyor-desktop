import { options } from 'preact';

const IS_LIFECYCLE_METHOD = /^(?:component[WD]|shouldComponent|render$)/;

if (process.env.NODE_ENV !== 'production') {
	// avoid installing into the same preact instance twice (eg: HMR)
	if (!options.__app_catch_undefined) {
		options.__app_catch_undefined = true;

		const style = document.createElement('style');
		style.appendChild(
			document.createTextNode(
				'undefined { display:block; background:red; } undefined:before { content:"missing component"; }'
			)
		);
		document.head.appendChild(style);

		// defer in order to ignore hacky `VNode = h().constructor` init stuff
		setTimeout(() => {
			const old = options.vnode;
			options.vnode = vnode => {
				// eslint-disable-next-line eqeqeq
				if (vnode.nodeName == null) {
					console.error(Error('Found undefined VNode name.'), vnode);
					vnode.nodeName = 'undefined';
				}
				if (old) old(vnode);
			};
		});
	}
}

/** Wraps component methods in try/catch to contain errors at component level
 *	@param {Object}  config                  Config options for insulating components
 *	@param {Boolean} config.ignoreStateless  If 'true', only wraps stateful components
 */
export function autoInsulate(config = {}) {
	// avoid installing into the same preact instance twice (eg: HMR)
	if (options.__app_error_boundary) return;
	options.__app_error_boundary = true;

	const old = options.vnode;
	options.vnode = vnode => {
		if (typeof vnode.nodeName === 'function') {
			vnode.nodeName =
				vnode.nodeName.__insulated !== undefined
					? vnode.nodeName.__insulated
					: (vnode.nodeName.__insulated = insulate(vnode.nodeName, config));
		}
		if (old) old(vnode);
	};
}

export function insulate(component, config = {}) {
	const name = component.displayName || component.name || 'component';
	if (component.prototype !== undefined && component.prototype.render !== undefined) {
		Object.getOwnPropertyNames(component.prototype).map(method => {
			if (typeof component.prototype[method] === 'function' && IS_LIFECYCLE_METHOD.test(method)) {
				component.prototype[method] = createSafeMethod(
					component.prototype[method],
					`${name}.${method}()`,
					true,
					method === 'render'
				);
			}
		});
		return component;
	}

	return config.ignoreStateless ? component : createSafeMethod(component, name, false, true);
}

/** Wraps `method()` in a try/catch with error logging.
 *	Note: proxies calls with up to 3 arguments.
 *	@param {Function} method Original function to call
 *	@param {String} name Display name to use when logging errors
 *	@param {Boolean} [isComponent=false] If `true`, caches renders per-instance. Default is to cache globally.
 *	@param {Boolean} [isRender=false] If `true`, returns the last successful return value when encountering an error.
 *	@returns {Function} safeCall(a, b, c)
 */
function createSafeMethod(method, name, isComponent, isRender) {
	let previous;
	return function safeCall(a, b, c) {
		try {
			previous = method.call(this, a, b, c);
			if (isComponent && isRender && this) this.__safeRenderFallback = previous;
			return previous;
		} catch (err) {
			err.message = `Error in ${name}: ${err.message || ''}`;
			if (console.error) console.error(err);
			if (isRender) return isComponent ? this && this.__safeRenderFallback : previous;
		}
	};
}
