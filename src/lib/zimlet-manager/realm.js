/** Creates a new Realm, which is a sandboxed context in which code can be executed.
 *  Sandboxes are *not* safe for arbitrary 3rd party code - they exist in the same
 *  context as the surrounding application.  They are, however, isolated scopes and
 *  as such have their own global variables, builtins, etc.
 *
 *  @param {Object} options
 *  @param {string} [options.name]	A name for the context (shows up as the frame name in browser console)
 *  @param {string} [options.code]	Source code to execute
 *  @param {Object} [options.scope]	Properties to add to the context's global scope
 *
 *  @returns {Context} context
 */
export default ({ name, code, scope } = {}) =>
	createContext({ name }).then(context => {
		const controller = /** @lends Context# */ {
			/** The realm's global context/scope (bidirectionally shared) */
			context,

			/** Evaluate code in the context. */
			eval: createEvalForContext(context),

			/** Expose given object's properties as globals in the realm's context */
			expose(properties) {
				for (const i in properties)
					if (properties.hasOwnProperty(i)) {
						context[i] = properties[i];
					}
			},

			/** Get a global property/variable from the context */
			getValue(ident) {
				return context[ident];
			},

			/** Set a global property/variable within the context */
			setValue(ident, value) {
				context[ident] = value;
			},

			/** Destroy the realm entirely. */
			destroy() {
				context.frameElement.parentNode.removeChild(context.frameElement);
			}
		};

		if (scope != null) {
			controller.expose(scope);
		}

		if (code != null) {
			controller.result = context.invokeCode(code);
			return controller.result.then(() => controller);
		}

		return controller;
	});

/** Creates a script tag-based eval() function within a given context.
 *  @param {Boolean} [wrap=true]		If `true`, wraps code in a closure, preventing implied globals.
 */
const createEvalForContext = context => (code, { wrap = true, sourceUrl } = {}) =>
	new Promise((resolve, reject) => {
		const keys = Object.keys(context);
		const { document } = context;
		const wrappedCode = wrap ? wrapCode(code) : unwrappedCode(code);
		context.__context = {
			name,
			// the script wrapper returned from wrapCode() invokes context.result() with the last expression evaluated:
			result(result, error) {
				script.parentNode.removeChild(script);
				if (error) return reject(error);
				const globals = getNewGlobals(context, keys);
				resolve({ result, globals });
			}
		};
		const script = document.createElement('script');
		// hack to fix webpack's HMR code which requires a source URL:
		script.setAttributeNS('http://www.w3.org/2000/svg', 'src', sourceUrl || '');
		script.appendChild(document.createTextNode(wrappedCode));
		document.body.appendChild(script);
	});

function getNewGlobals(context, previous) {
	const globals = {};
	for (const i in context) {
		if (context.hasOwnProperty(i) && previous.indexOf(i) === -1) {
			globals[i] = context[i];
		}
	}
	return globals;
}

/** Invoke code directly within the given context, no safeguards against global pollution. */
function unwrappedCode(code) {
	const wrapped = `
	try {
		${code}
	} catch (err) {
		window.__context._error = err;
	}
	(function(context) {
		delete window.__context;
		context.result(null, context._error);
	}(window.__context));
	`;
	return wrapped;
}

/** Invoke code within a closure, setting `this` to undefined and preventing accidental global pollution. */
function wrapCode(code) {
	const wrapped = `
	(function() {
		var context = window.__context;
		delete window.__context;
		try {
			context._result = (function(context) {
				${code}
			})()
		} catch (err) {
			context._error = err;
		}
		context.result(context._result, context._error);
	}());
	`;
	return wrapped;
}

const MAX_INIT_TIME = 2500;

/** Create an on-domain iframe. Async because IE (8?) can't do this synchronously. */
const createContext = ({ name }) =>
	new Promise((resolve, reject) => {
		const frame = document.createElement('iframe');
		frame.name = name || 'Unnamed Context';

		// Frame must be at least 32px to allow generation of drag/drop badges.
		frame.style.cssText =
			'position:absolute; left:0; top:-10000px; width:32px; height:32px; overflow:hidden;';
		document.body.appendChild(frame);
		function getContext() {
			try {
				frame.contentWindow.document.body.getAttribute('foo');
				return frame.contentWindow;
			} catch (e) {}
		}
		const start = Date.now();
		function check() {
			const ctx = getContext();
			let done = false;
			if (ctx != null) {
				resolve(ctx);
				done = true;
			} else if (Date.now() - start > MAX_INIT_TIME) {
				reject(Error('Sandbox creation timed out.'));
				done = true;
			}
			if (done) {
				frame.onload = frame.onerror = null;
				clearInterval(frame.timer);
				return true;
			}
			return false;
		}
		if (!check()) {
			frame.onload = frame.onerror = check;
			frame.timer = setInterval(check, 50);
		}
	});
