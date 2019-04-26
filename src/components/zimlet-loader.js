import { Component } from 'preact';
import { version } from '../../package.json';
import difference from 'lodash-es/difference';
import pick from 'lodash-es/pick';
import get from 'lodash-es/get';
import zimletLocalStorage from '../utils/zimlet-storage';
import wire from 'wiretie';
import withAccountInfo from '../graphql-decorators/account-info';

// Zimlets that will always be loaded.
// These can be overridden (for development) by loading a Zimlet of the same name with a different URL.
const CONSTANT_ZIMLETS = {
	serverConsolidatedZimlets: {
		url: `/service/zimlet/res/Zimlets-nodev_all.zgz?zimbraXZimletCompatibleWith=${version}&cacheBust=${Date.now()}` // TODO: Add cosId
	}
};

@wire('zimlets', null, ({ loadZimletByUrls }) => ({ loadZimletByUrls }))
@withAccountInfo()
export default class ZimletLoader extends Component {
	static localStorageInitialized = false;
	static pending = {};
	static running = {};
	static errors = {};

	loadRemoteZimlet = props => {
		const { loadZimletByUrls, zimlets, account } = props;

		const disabledZimlets = (get(account, 'zimlets.zimlet') || []).reduce((memo, zimlet) => {
			const name = get(zimlet, 'zimlet.0.name');
			if (name && get(zimlet, 'zimletContext.0.presence') === 'disabled') {
				memo.push(name);
			}

			return memo;
		}, []);

		if (!zimlets || !Object.keys(zimlets).length) {
			return;
		}

		// TODO: Try to get rid of suggestedName entirely, use URL as cacheKey
		Object.keys(zimlets).forEach(suggestedName => {
			const { url } = zimlets[suggestedName];
			if (ZimletLoader.running[suggestedName]) {
				return console.warn(`[ZimletSDK "${suggestedName}"]: Zimlet is already running.`); // eslint-disable-line no-console
			}

			if (ZimletLoader.pending[suggestedName]) {
				ZimletLoader.pending[suggestedName].then(this.callOnLoad);
				return console.warn(`[ZimletSDK "${suggestedName}"]: Zimlet is already pending.`); // eslint-disable-line no-console
			}

			if (!url) {
				const errorMsg = 'Zimlet URL Required';
				ZimletLoader.errors[suggestedName] = errorMsg;
				return console.warn(`[ZimletSDK "${suggestedName}"]: ${errorMsg}`); // eslint-disable-line no-console
			}

			return (ZimletLoader.pending[suggestedName] = loadZimletByUrls(url, {
				name: suggestedName,
				compat: false
			})
				.then(results =>
					results.forEach(
						({ name, zimlet }) => disabledZimlets.indexOf(name) === -1 && zimlet.init()
					)
				)
				.then(() => {
					console.info(`[ZimletSDK "${suggestedName}"]: Loaded successfully from ${url}`); // eslint-disable-line no-console
					ZimletLoader.running[suggestedName] = { url };
					delete ZimletLoader.errors[suggestedName];
				})
				.catch(error => {
					console.warn(`[ZimletSDK "${suggestedName}"]:`, error); // eslint-disable-line no-console
					ZimletLoader.errors[suggestedName] = error;
				})
				.then(() => {
					this.callOnLoad();
					delete ZimletLoader.pending[suggestedName];
				}));
		});

		return this.callOnLoad();
	};

	callOnLoad = () =>
		this.props.onLoadZimlets &&
		this.props.onLoadZimlets({ running: ZimletLoader.running, errors: ZimletLoader.errors });

	componentWillMount() {
		if (!ZimletLoader.localStorageInitialized) {
			ZimletLoader.localStorageInitialized = true;
			const persistedZimlets = zimletLocalStorage.get();

			if (persistedZimlets && Object.keys(persistedZimlets)) {
				const zimlets = { ...CONSTANT_ZIMLETS, ...this.props.zimlets, ...persistedZimlets };

				this.loadRemoteZimlet({
					...this.props,
					zimlets
				});
			}
		} else {
			this.loadRemoteZimlet(this.props);
		}
	}

	componentWillReceiveProps(nextProps) {
		if (!nextProps.zimlets || !this.props.zimlets) {
			return;
		}

		const newZimlets = difference(Object.keys(nextProps.zimlets), Object.keys(this.props.zimlets));
		if (newZimlets.length) {
			this.loadRemoteZimlet({
				...nextProps,
				zimlets: pick(nextProps.zimlets, newZimlets)
			});
		}
	}
}
