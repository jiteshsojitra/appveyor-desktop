import allActions from '../actions';
import allSelectors from '../selectors';
import createReducer from '../reducers';

/**
 * Create a store enhanced with the ability to accept new reducers, and attach all actions and selectors as metadata to the store.
 * This allows zimlets with access to the store to dispatch any action, or use any selector.
 * @param {Function} createStore    A {@type StoreCreator} function, such as `redux.createStore`
 * @returns {Function}              A {@type StoreCreator} for enhancing stores with extra data under the `zimletRedux` property.
 */
export function zimletReduxStoreEnhancer(createStore) {
	return function createEnhancedStore(...args) {
		const store = createStore(...args);

		const dynamicFromZimlets = {
			reducers: {},
			actions: {},
			selectors: {}
		};

		store.zimletRedux = {
			injectAsyncReducer(namespace, asyncReducer) {
				// see https://stackoverflow.com/questions/32968016/how-to-dynamically-load-reducers-for-code-splitting-in-a-redux-application
				dynamicFromZimlets.reducers[namespace] = asyncReducer;
				store.replaceReducer(createReducer(dynamicFromZimlets.reducers));
			},
			addActions(namespace, actions) {
				dynamicFromZimlets.actions[namespace] = actions;
			},
			removeActions(namespace) {
				delete dynamicFromZimlets.actions[namespace];
			},
			addSelectors(namespace, selectors) {
				dynamicFromZimlets.selectors[namespace] = selectors;
			},
			removeSelectors(namespace) {
				delete dynamicFromZimlets.selectors[namespace];
			}
		};

		Object.defineProperty(store.zimletRedux, 'actions', {
			get() {
				return { ...dynamicFromZimlets.actions, ...allActions };
			}
		});

		Object.defineProperty(store.zimletRedux, 'selectors', {
			get() {
				return { ...dynamicFromZimlets.selectors, ...allSelectors };
			}
		});

		return store;
	};
}
