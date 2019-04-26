/* eslint no-unused-vars:1 */

/* these two imports are deprecated, use shims instead */
import { h, Component, cloneElement } from 'preact';
import { route, Link } from 'preact-router';

import emitter from 'mitt';
//import qs from 'query-string';
import delve from 'lodash-es/get';
import realm from './realm';
import createCache from './cache';
// import compat from './compat';  //commented out for now. Can be deleted when we are super sure we won't do any backwards compat
import * as allBlocks from '@zimbra/blocks';
import MenuItem from '../../components/menu-item';
import Sidebar from '../../components/sidebar';
import MailSidebar from '../../components/mail-sidebar';
import FolderList from '../../components/folder-list';
import SmartList from '../../components/smart-list';
import ActionMenuMoveFolder from '../../components/action-menu-move-folder';
import ActionButton from '../../components/action-button';
import ConfirmModalDialog from '../../components/confirm-modal-dialog';
import ModalDialog from '../../components/modal-dialog';
import CaptureBeforeUnload from '../../components/capture-before-unload';
import TextInput from '../../components/text-input';
import ActionMenuGroup from '../../components/action-menu-group';
import ActionMenuItem from '../../components/action-menu-item';
import DraggableCard from '../../components/draggable-card';
import ContextMenu from '../../components/context-menu';
import ActionMenu, { DropDownWrapper } from '../../components/action-menu';
import draftForMessage from '../../utils/draft-for-message';
import ContactList from '../../components/contacts/list';
import ContactEditor from '../../components/contacts/editor';
import HelpButton from '../../components/help-button';
import AppointmentEdit from '../../components/calendar/appointment-edit';
import { htmlToText } from '../../lib/html-email';
import { colorForCalendar, filterNonEditableCalendars } from '../../utils/calendar';
import jwtStorage from '../../utils/jwt';
import { newAlarm } from '../../utils/event';
import moment from 'moment';
import shims from './shims';

// For rich text area toolbar
import ToolbarButton from '../../components/gui-rich-text-area/components/toolbar/toolbar-button';
import CollapsedSubmenu from '../../components/gui-rich-text-area/components/toolbar/collapsed-submenu';
import InfiniteScroll from '../../components/infinite-scroll';
import ColorPicker from './../../components/color-picker';

const components = {
	...allBlocks, // TODO: Remove on breaking release.
	MenuItem,
	Sidebar,
	MailSidebar,
	FolderList,
	SmartList,
	ActionMenuMoveFolder,
	ActionButton,
	CaptureBeforeUnload,
	ConfirmModalDialog,
	ModalDialog,
	TextInput,
	ActionMenu,
	DropDownWrapper,
	ActionMenuItem,
	ActionMenuGroup,
	DraggableCard,
	ContextMenu,
	ToolbarButton,
	CollapsedSubmenu,
	InfiniteScroll,
	ContactList,
	ContactEditor,
	HelpButton,
	AppointmentEdit,
	ColorPicker
};

const utils = {
	draftForMessage,
	moment,
	htmlToText,
	colorForCalendar,
	newAlarm,
	filterNonEditableCalendars
};

const SHOW_ZIMLETS_URL_FLAG = /[?&#]zimletSlots=show(?:&|$)/;

export default function zimletManager({
	zimbra,
	store,
	config,
	showZimletSlots,
	keyBindings,
	shortcutCommandHandler
}) {
	const { zimbraOrigin, useJwt } = config;
	const exports = emitter();
	exports.initialized = false;
	const oninit = deferred();
	let initializing = false;
	exports.failedInitializations = 0;

	//Show zimlet slots
	if (
		showZimletSlots ||
		(typeof location !== 'undefined' && String(location).match(SHOW_ZIMLETS_URL_FLAG))
	) {
		exports.showZimletSlots = true;
	}

	const plugins = {};

	let idCounter = 0;

	const zimbraContextGlobals = {
		ZIMLETS_VERSION: '2.0.0'
	};

	const zimbraRealm = realm({
		name: 'Zimlet Manager',
		scope: zimbraContextGlobals
	}).then(r => (zimbraRealm.sync = r));

	function getAccount() {
		return delve(store.getState(), 'email.account') || {};
	}

	exports.invokePlugin = function invokePlugin(name, ...args) {
		const list = plugins[name],
			results = [];
		let res;
		if (list) {
			for (let i = 0; i < list.length; i++) {
				try {
					if (typeof list[i].handler === 'function') {
						res = list[i].handler(...args);
					} else {
						res = list[i].handler;
					}
				} catch (err) {
					err.sourceZimlet = list[i].zimletName;
					res = err;
				}
				results.push(res);
			}
		}
		return results;
	};

	// Create a zimlet-specific registry for adding/removing named plugins (eg: slots)
	function createPlugins(zimletName) {
		return {
			register(name, handler) {
				const list = plugins[name] || (plugins[name] = []);
				list.push({ zimletName, handler });
				exports.emit('plugins::changed', name);
			},
			unregister(name, handler) {
				const list = plugins[name];
				if (list) {
					for (let i = list.length; i--; ) {
						if (list[i].zimletName === zimletName && list[i].handler === handler) {
							list.splice(i, 1);
							exports.emit('plugins::changed', name);
							break;
						}
					}
				}
			},
			unregisterAll() {
				for (const name in plugins) {
					if (plugins.hasOwnProperty(name)) {
						const list = plugins[name];
						let changed = false;
						for (let i = list.length; i--; ) {
							if (list[i].zimletName === zimletName) {
								list.splice(i, 1);
								changed = true;
							}
						}
						if (changed) {
							exports.emit('plugins::changed', name);
						}
					}
				}
			}
		};
	}

	function createStyler(zimletName) {
		let tag;
		return {
			set(css) {
				css = String(css || '');
				if (!tag) {
					tag = document.createElement('style');
					tag.id = `zimlet-style-${zimletName}`;
					tag.appendChild(document.createTextNode(css));
					document.head.appendChild(tag);
				} else {
					tag.firstChild.nodeValue = css;
				}
			},
			remove() {
				if (tag) tag.parentNode.removeChild(tag);
				tag = null;
			}
		};
	}

	function runZimlets(code, options = {}) {
		const zm = options.zimlet || (options.config && options.config.zimlet) || {};
		const name = zm.name || options.name || `zimlet_${++idCounter}`;
		let factory;
		let container;

		const zimletContext = {
			zimbraOrigin,
			zimlets: exports,
			zimbra,
			zimletRedux: store.zimletRedux,
			getAccount,
			config: options.config,
			plugins: createPlugins(name),
			resourceUrl: `/service/zimlet/${encodeURIComponent(name)}/`,
			cache: createCache(name),

			/* all lines from here to shims are deprecated, use shims instead */
			h, // TODO: Remove on breaking release
			createElement: h, // TODO: Remove on breaking release
			Component, // TODO: Remove on breaking release
			cloneElement, // TODO: Remove on breaking release
			route, // TODO: Remove on breaking release
			Link, // TODO: Remove on breaking release
			/******/

			shims,
			components: Object.assign({}, components), // TODO: Remove on breaking release (change to @zimbra-client/components)
			utils: Object.assign({}, utils),
			styles: createStyler(name),
			keyBindings,
			shortcutCommandHandler
		};

		if (options.context) Object.assign(zimletContext, options.context);

		return zimbraRealm
			.then(c => {
				container = c;

				// @note: compat is disabled/removed for now
				zimletContext.isCompat = false;
				// zimletContext.isCompat = options.compat === true || (options.compat !== false && exports.compat.isCompatZimlet(name, zm));
				// if (zimletContext.isCompat) {
				// 	container.expose(exports.compat.getGlobals(zimletContext));
				// }

				// Expose the global zimlet(factory) register function:
				container.expose({
					zimlet: f => {
						factory = f;
					}
				});

				// Expose any additional custom scope items:
				if (options.scope) container.expose(options.scope);

				// Actually run the zimlet code:
				return container.eval(code, {
					wrap: !zimletContext.isCompat,
					sourceUrl: options.url
				});
			})
			.then(context => {
				context.zimletContext = zimletContext;

				// overwrite the container's zimlet() method with one that performs an update instead of an init:
				container.expose({
					zimlet: f => {
						//eslint-disable-next-line no-console
						console.log(` 🔄 Zimlet ${name} restarted.`);
						context._shutdown();
						factory = f;
						context._setup();
						context.init();
					}
				});

				// Get a list of methods that can be invoked on a zimlet:
				context.getHandlerMethods = () =>
					Object.keys(context.handler || {}).reduce(
						(acc, n) => ((acc[n] = context.handler[n].bind(context)), acc),
						{}
					);

				// Invoke a method on the zimlet's public (returned) interface:
				context.invoke = (method, ...args) => {
					if (!context.handler) throw Error(`No method ${method}()`);
					const path = ['handler'].concat(method.split('.'));
					method = path.pop();
					const ctx = delve(context, path);
					return ctx[method](...args);
				};

				// Initialize the zimlet if it hasn't already been initialized.
				context.init = () => {
					if (context.initialized !== true) {
						context.initialized = true;
						if (context.init) return context.invoke('init');
					}
				};

				// Inform zimlet of shutdown, remove all plugins & stylesheets, then kill it.
				// Note: this intentionally does not destroy the container, since it is used for soft restarts (eg: HMR)
				context._shutdown = () => {
					try {
						if (context.unload) context.invoke('unload');
						if (context.destroy) context.invoke('destroy');
					} catch (err) {
						console.error('Error shutting down zimlet: ' + err);
					}
					zimletContext.plugins.unregisterAll();
					zimletContext.styles.remove();
					context.initialized = false;
				};

				// (re-)initialize the zimlet by invoking its register factory
				context._setup = () => {
					try {
						const handlerObj = zm.handlerObject;
						if (factory) {
							//eslint-disable-next-line new-cap
							context.handler = new factory(zimletContext);
						} else if (handlerObj) {
							context.handler = new context.globals[handlerObj]();
						}
					} catch (err) {
						return Promise.reject(Error(`Failed to construct handlerObject: ${err}`));
					}
				};

				return context._setup() || context;
			});
	}

	exports.initialize = function initialize() {
		if (initializing === false && !exports.initialized) {
			initializing = false;
			exports.initialized = true;

			oninit.resolve(exports);
			exports.emit('init', exports);
			return Promise.resolve();
		}
		return oninit;
	};

	exports.destroy = function destroy() {
		if (zimbraRealm.sync) {
			zimbraRealm.sync.destroy();
		}
	};

	/**
	 * Load a bundle containing one or more Zimlets. Zimlets must be seperated by
	 * the token defined below in {@function seperateConsolidatedZimlets}
	 */
	exports.loadZimletByUrls = function loadZimlet(url, options = {}) {
		options.url = url;
		let credentials = 'same-origin';
		const headers = options.headers || {};

		if (/^\/[^/]/.test(url)) {
			// Resolve relative URLs to absolute with the zimbraOrigin, and include credentials
			url = zimbraOrigin + url;
			credentials = 'include';
			const jwtToken = useJwt && jwtStorage.get();
			if (jwtToken) {
				headers.Authorization = `Bearer ${jwtToken}`;
			}
		}
		return fetch(url, { credentials, headers })
			.then(r => {
				if (r.ok) {
					return r.text();
				}
				const error = new Error(r.statusText || r.status);
				error.response = r;
				return Promise.reject(error);
			})
			.then(code => seperateConsolidatedZimlets(code))
			.then(codes =>
				Promise.all(
					codes.map(({ name, code }) =>
						exports.runZimlet(`${name || options.name || url}`, code, options)
					)
				)
			);
	};

	const runCache = {};
	exports.runZimlet = function runZimlet(name, code, options = {}) {
		if (name in runCache) {
			//eslint-disable-next-line no-console
			console.log(`Zimlet "${name}" has already been started.`);
			return runCache[name];
		}

		return (runCache[name] = exports
			.initialize()
			.then(() => runZimlets(code, options))
			.then(zimlet => ({
				name,
				zimlet
			})));
	};

	// exports.compat = compat({
	// 	zimlets: exports,
	// 	zimbra,
	// 	store,
	// 	zimbraOrigin
	// });

	setTimeout(exports.initialize, 1000);

	return exports;
}

//const array = obj => Array.isArray(obj) ? obj : [].concat(obj);

function deferred() {
	let resolve, reject;
	const me = new Promise((realResolve, realReject) => {
		resolve = realResolve;
		reject = realReject;
	});
	me.resolve = resolve;
	me.reject = reject;
	return me;
}

function seperateConsolidatedZimlets(consolidatedCode) {
	// Seperated by a comment with trailing whitespace, newline, Zimlet:, close comment, newline.
	// e.g. /*
	//       * Zimlet: ... */

	const names = consolidatedCode
		.split(/\n/)
		.filter(line => /\*\sZimlet:.*File:.*\*\//.test(line))
		.map(line => line.replace(/.*Zimlet: (.*)File:.*/, '$1'));

	return consolidatedCode
		.split(/\/\*\s\n\s*\*\sZimlet:.*\*\/\n/)
		.filter(Boolean)
		.map((code, index) => ({
			name: names[index],
			code
		}));
}
