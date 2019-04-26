import { h, Component } from 'preact';
import Match from 'preact-router/match';
import runtimeInstall from '../../pwa';
import { route } from 'preact-router';
import ApolloClient from 'apollo-client';
import DebounceLink from 'apollo-link-debounce';
import { ApolloLink, split } from 'apollo-link';
import { ApolloProvider, graphql } from 'react-apollo';
import RetryAllLink from '../../apollo/retry-all-link';
import GraphQLServerLink from '../../apollo/graphql-server-link';
import { branch, renderComponent } from 'recompose';
import ZimletLoader from '../zimlet-loader';
import cloneDeep from 'lodash/cloneDeep';
import cx from 'classnames';
import { getEmail } from '../../lib/util';
import newMessageDraft from '../../utils/new-message-draft';
import getApplicationStorage, { getApplicationStorageMaxSize } from '../../constants/storage';
import { clearOfflineData } from '../../utils/offline';
import {
	startWatchingOfflineStatus,
	checkOfflineStatus,
	watchOfflineStatus
} from '@zimbra/is-offline';
import jwtStorage from '../../utils/jwt';
import Routes from '../../routes';
import queryString from 'query-string';
import Provider from 'preact-context-provider';
import Login from '../login';
import ProgressIndicator from '../progress-indicator';
import ExternalHeader from '../external-header';
import Header from '../header';
import AppNavigation from '../app-navigation';
import SettingsModal from '../settings-modal';
import KeyboardShortcutsModal from '../keyboard-shortcuts-modal';
import AttachmentViewer from '../attachment-viewer';
import Notifications from '../notifications';
import NotificationModal from '../notification-modal';
import config, { configure } from '../../config';
import { fetchLocalFolderConfig } from '../../utils/account-config';
import { connect } from 'preact-redux';
import createStore from '../../store';
import zimbraClient from '../../lib/zimbra-client';
import zimletManager from '../../lib/zimlet-manager';
import createGifClient from '../../lib/gif-client';
import * as urlActionCreators from '../../store/url/actions';
import * as emailActionCreators from '../../store/email/actions';
import { notify } from '../../store/notifications/actions';
import { setPreviewAttachment } from '../../store/attachment-preview/actions';
import { offlineConnectionStatus, setSyncInProgress } from '../../store/network/actions';
import { setAuthTokenExpired } from '../../store/active-account/actions';
import { getSelectedAttachmentPreview } from '../../store/attachment-preview/selectors';
import { getRouteProps } from '../../store/url/selectors';
import style from './style';
import KeyboardShortcutHandler from '../../keyboard-shortcuts/keyboard-shortcut-handler';
import KeyToCommandBindings from '../../keyboard-shortcuts/key-to-command-bindings';
import searchInputStyle from '../search-input/style';
import NoopQuery from '../../graphql/queries/noop.graphql';
import accountInfo from '../../graphql-decorators/account-info';
import ServerUrlDialog from '../login/server-url-dialog';
import Reminders from '../reminders';
import localFolderHandler from '@zimbra/electron-app/src/local-folder';
import { hasDirectives } from 'apollo-utilities';
import { getOperationAST } from 'graphql';
import FaviconWithBadge from '../favicon-with-badge';

import {
	createZimbraSchema,
	LocalBatchLink,
	ZimbraInMemoryCache,
	CacheType,
	ZimbraErrorLink,
	OfflineQueueLink
} from '@zimbra/api-client';

import { CachePersistor } from 'apollo-cache-persist';

import { Text } from 'preact-i18n';
import withCommandHandlers from '../../keyboard-shortcuts/with-command-handlers';
import AboutModal from './../about-modal';
import { withClientState } from 'apollo-link-state';
import ApolloCacheRouter from 'apollo-cache-router';
import { resolvers as localFolderResolvers } from '../../apollo/local-folder-resolver';
import OfflineDataLoader from '../offline-data-loader/index';
import withIntlWrapper from '../../enhancers/intl-wrapper';
import { AppShell, Loader } from '../app-shell-loader';
import { fetchUserAgentName } from '../../utils/user-agent';
import { BottomSideAdSlots } from '../ad-slots';
import withMediaQuery from '../../enhancers/with-media-query';
import { maxWidth, screenSmMax } from '../../constants/breakpoints';

const DEBOUNCE_LINK_TIMEOUT = 135;

const userAgent = {
	name: fetchUserAgentName(),
	version: '' // Current Server version of the backend.
};

const LoginContainer = ({ refetchAccount }) => (
	<AppShell>
		<Login onLogin={refetchAccount} />
		<Notifications />
	</AppShell>
);

const ServerUrlContainer = () => (
	<AppShell>
		<ServerUrlDialog />
		<Notifications />
	</AppShell>
);

@configure('zimbraOrigin,zimbraGraphQLEndPoint,routes.slugs,giphyKey,useJwt')
export default class Provide extends Component {
	syncOfflineMutationQueue = () => {
		this.offlineQueueLink.getSize().then(size => {
			if (size > 2) {
				this.store.dispatch(setSyncInProgress(true));

				return this.offlineQueueLink.sync({ apolloClient: this.apolloClient }).then(() => {
					this.store.dispatch(setSyncInProgress(false));
				});
			}
		});
	};

	constructor(props, context) {
		super(props, context);

		const { zimbraOrigin, zimbraGraphQLEndPoint, useJwt } = this.props;
		const jwtToken = useJwt && jwtStorage.get();

		// this is the api client that gets used by the zm-x-web to directly invoke soap
		this.zimbra = zimbraClient({
			url: zimbraOrigin,
			jwtToken
		});

		this.store = createStore({}, this.zimbra);

		runtimeInstall(() => {
			this.store.dispatch(
				notify({
					message: <Text id="app.notifications.updatesAvailable" />,
					action: {
						label: <Text id="buttons.reload" />,
						fn: () => location.reload()
					}
				})
			);
		});

		this.keyBindings = new KeyToCommandBindings();
		this.shortcutCommandHandler = new KeyboardShortcutHandler({
			store: context.store,
			keyBindings: this.keyBindings
		});

		this.zimlets = zimletManager({
			zimbra: this.zimbra,
			store: this.store,
			config,
			keyBindings: this.keyBindings,
			shortcutCommandHandler: this.shortcutCommandHandler
		});

		// Content providers (images, gifs, videos, news).
		this.content = {
			gifs: createGifClient(this.props)
		};

		/** Begin Apollo Setup */

		// TODO: Cache eviction: timestamp records on read, sort by oldest, remove oldest until storage is within quota.
		// TODO: Tag items as "offlineCritical" if they should never be evicted
		getApplicationStorage().then(storage => {
			this.networkCache = new ZimbraInMemoryCache({}, CacheType.network);
			this.localCache = new ZimbraInMemoryCache({}, CacheType.local);

			this.cache = ApolloCacheRouter.override(
				ApolloCacheRouter.route([this.networkCache, this.localCache], document => {
					const operationName = getOperationAST(document).name;

					if (
						hasDirectives(['client'], document) ||
						(operationName && operationName.value === 'GeneratedClientQuery')
					) {
						return [this.localCache];
					}

					return [this.networkCache];
				})
			);

			// returns the graphqlSchema and the batchClient of zm-api-js client
			const { client: batchClient, schema } = createZimbraSchema({
				cache: this.networkCache,
				zimbraOrigin,
				jwtToken,
				userAgent
			});

			// the batchClient of zm-api-js is helpful to invoke apis from the api-js batch client
			this.batchClient = batchClient;

			// schema also gets added to context provider, to be used by graphiql screen
			this.schema = schema;

			// this helps to batch the requests, and is responsible for invoking all the
			// graphql requests on the specified schema and return the results
			this.batchLink = new LocalBatchLink({
				schema
			});

			// helps to register error handlers and executes them on graphql errors
			this.zimbraErrorLink = new ZimbraErrorLink();
			this.zimbraErrorLink.registerHandler(console.error.bind(console));

			// a link responsible for managing the offline operations, requires a storage to store
			// the link operations and hydrate them again
			// all operations go through this link, if the network is not offline,
			// the link just passes the operation to the next link
			this.offlineQueueLink = new OfflineQueueLink({ storage });

			// A link that retries the requests based on the config
			// checks the errors to decide whether the request has failed
			this.retryLink = new RetryAllLink({
				attempts: {
					max: 3
				}
			});

			// used for local offline storage
			// client state is useful to store client-only values in the cache, which do not have any
			// counterpart on the server side, and are not sent over the graqphql server
			// and are queried only in the cache
			this.stateLink = withClientState({
				cache: this.cache,
				resolvers: localFolderResolvers
			});

			this.apolloLink = ApolloLink.from([
				this.stateLink,
				this.zimbraErrorLink,
				new DebounceLink(DEBOUNCE_LINK_TIMEOUT),
				this.retryLink,
				this.offlineQueueLink,
				// TODO: When we need to support batching for backend graphql apis, we would have to define
				// one more link here, which would, based on the context variable, either use http-link or
				// http-batch-link (needs to be created when needed)
				split(
					operation => operation.getContext().remote === true,
					new GraphQLServerLink({ zimbraOrigin, zimbraGraphQLEndPoint }),
					this.batchLink
				)
			]);

			this.persistCache = new CachePersistor({
				cache: this.networkCache,
				storage,
				maxSize: getApplicationStorageMaxSize()
			});

			(window.location.search.indexOf('nocache=true') === -1
				? this.persistCache.restore()
				: Promise.resolve()
			)
				.catch(e => {
					console.warn(
						'Could not restore persistent Apollo cache. Are you in private browsing mode?',
						e
					);
				})
				.then(() => {
					const isOffline = checkOfflineStatus();
					this.apolloClient = new ApolloClient({
						cache: this.cache,
						link: this.apolloLink,
						defaultOptions: {
							watchQuery: {
								fetchPolicy: isOffline ? 'cache-first' : 'cache-and-network'
							}
						}
					});

					// If the App is online, sync any local mutations. Otherwise set the app to
					// Offline mode
					if (!isOffline) {
						this.syncOfflineMutationQueue();
					} else {
						this.store.dispatch(offlineConnectionStatus(isOffline));
					}

					// Poll real network status, side effect for `watchOfflineStatus`
					this.stopWatchingOfflineStatus = startWatchingOfflineStatus(zimbraOrigin);

					// Watch offline status changes.
					this.clearWatchOfflineStatus = watchOfflineStatus(offline => {
						this.store.dispatch(offlineConnectionStatus(offline));
						this.apolloClient.defaultOptions.watchQuery = {
							fetchPolicy: offline ? 'cache-first' : 'cache-and-network'
						};
						if (offline) {
							this.offlineQueueLink.close();
						} else {
							this.offlineQueueLink.open({ apolloClient: this.apolloClient });
						}
					});

					this.setState({}); // queue a rerender (hacky)

					if (process.env.NODE_ENV === 'development') {
						window.apolloClient = this.apolloClient;
						window.batchClient = this.batchClient;
						window.offlineLink = this.offlineQueueLink;
						window.zimbra = this.zimbra;
						window.store = this.store;
						window.storage = storage;
						window.zimlets = this.zimlets;
						window.content = this.content;
					}
				});
		});
	}

	componentWillUnmount() {
		this.clearWatchOfflineStatus();
		this.stopWatchingOfflineStatus();
		this.zimlets.destroy();
	}

	render(props) {
		return (
			this.apolloClient && (
				<Provider
					config={config}
					store={this.store}
					zimbra={this.zimbra}
					zimlets={this.zimlets}
					gifs={this.content.gifs}
					links={this.content.links}
					keyBindings={this.keyBindings}
					shortcutCommandHandler={this.shortcutCommandHandler}
					schema={this.schema}
					zimbraBatchClient={this.batchClient}
					zimbraBatchLink={this.batchLink}
					zimbraErrorLink={this.zimbraErrorLink}
					offlineQueueLink={this.offlineQueueLink}
					persistCache={this.persistCache}
				>
					<ApolloProvider client={this.apolloClient}>
						<App {...props} />
					</ApolloProvider>
				</Provider>
			)
		);
	}
}

@configure('nav,localStorePath')
@accountInfo()
@withMediaQuery(maxWidth(screenSmMax), 'matchesScreenMd')
@branch(({ account, accountLoading }) => !account && accountLoading, renderComponent(Loader))
@withIntlWrapper()
@branch(
	({ zimbraOrigin }) =>
		typeof process.env.ELECTRON_ENV !== 'undefined' &&
		(!zimbraOrigin || zimbraOrigin.indexOf('/') === 0),
	renderComponent(ServerUrlContainer)
)
@branch(({ account }) => !account, renderComponent(LoginContainer))
@connect(
	state => ({
		attachment: getSelectedAttachmentPreview(state),
		showSettings: state.settings.visible,
		showAbout: state.about.visible,
		zimletModals: state.zimlets.modals,
		routeProps: getRouteProps(state),
		isOffline: state.network.isOffline
	}),
	{
		...urlActionCreators,
		...emailActionCreators,
		closeAttachmentPreview: setPreviewAttachment,
		notify,
		setAuthTokenExpired
	}
)
// Keep the session alive with a Noop every 5 minutes
@graphql(NoopQuery, {
	options: ({ isOffline }) => ({
		pollInterval: isOffline ? 0 : 300000,
		// we should not need this fetchPolicy delcared here, but it was added to fix the issue that
		// this request was using the 'cache-first' even when user comes online after going offline, hence overrode here
		fetchPolicy: isOffline ? 'cache-first' : 'cache-and-network'
	})
})
@withCommandHandlers(props => [
	{ context: 'all', command: 'GO_TO_MAIL', handler: () => route('/') },
	{ context: 'all', command: 'GO_TO_MAIL', handler: () => route('/') },
	{
		context: 'all',
		command: 'GO_TO_CALENDAR',
		handler: () => route(`/${props.slugs.calendar}`)
	},
	{
		context: 'all',
		command: 'GO_TO_CONTACTS',
		handler: () => route(`/${props.slugs.contacts}`)
	},
	{
		context: 'all',
		command: 'COMPOSE_MESSAGE',
		handler: () => route('/') && props.openModalCompose({ message: newMessageDraft() })
	},
	{
		context: 'all',
		command: 'NEW_CONTACT',
		handler: () => route(`/${props.slugs.contacts}/new`)
	},
	{
		context: 'all',
		command: 'FOCUS_SEARCH_BOX',
		handler: ({ e }) => {
			e && e.preventDefault();
			document.getElementsByClassName(searchInputStyle.input)[0].focus(); //a bit hacky.  Less hacky would be to store ref in redux store
		}
	}
])
export class App extends Component {
	routeChanged = e => {
		if (this.props.attachment) {
			// Remove any preview attachments when changing routes.
			this.props.closeAttachmentPreview();
		}

		this.props.setUrl(e.url);
		const { matches, path, url, ...routeProps } = e.current.attributes;
		this.props.setRouteProps(routeProps);
	};

	handleGlobalClick = e => {
		let { target } = e;
		do {
			if (
				String(target.nodeName).toUpperCase() === 'A' &&
				target.href &&
				target.href.match(/^mailto:/)
			) {
				let [, address, query] = target.href.match(/^mailto:\s*([^?]*)\s*(\?.*)?/i);
				const params = query ? queryString.parse(query) : {};
				address = decodeURIComponent(address) || params.to;

				params.to = [{ address, email: getEmail(address) }];
				this.openComposer(params);
				e.preventDefault();
				return false;
			}
		} while ((target = target.parentNode));
	};

	openComposer(params) {
		const message = Object.assign(newMessageDraft(), params);
		route('/') &&
			this.props.openModalCompose({
				mode: 'mailTo',
				message
			});
	}

	handleGlobalKeyDown = e => {
		this.context.shortcutCommandHandler.handleKeyDown({ e });
	};

	componentDidMount() {
		addEventListener('click', this.handleGlobalClick);
		addEventListener('keydown', this.handleGlobalKeyDown);

		const {
			account,
			localStorePath,
			notify: notifyAction,
			setAccount,
			setAuthTokenExpired: setAuthExpired
		} = this.props;

		if (typeof process.env.ELECTRON_ENV !== 'undefined') {
			const folderConfig = fetchLocalFolderConfig(account.name, localStorePath);
			if (!Object.keys(folderConfig).length) {
				localFolderHandler({
					operation: 'create-account-folder',
					folderPath: localStorePath,
					accountName: account.name
				});
			}
		}

		account && setAccount(cloneDeep(account));
		userAgent.version = account && account.version.split(' ')[0];

		this.context.zimbraErrorLink.registerHandler(({ errorCode, message }) => {
			if (/Failed to fetch/.test(message)) {
				notifyAction({
					message: <Text id="faults.network.offlineError" />,
					failure: true
				});
				return;
			}

			switch (errorCode) {
				case 'service.AUTH_EXPIRED':
				case 'service.AUTH_REQUIRED':
					clearOfflineData(this.context);

					if (typeof process.env.ELECTRON_ENV !== 'undefined') {
						window.location.reload();
						break;
					}

					setAuthExpired(true);

					// Show error to user
					notifyAction({
						message: <Text id="faults.account.AUTH_EXPIRED" />,
						duration: 86400, // Increase duration of notification to make it persistant
						failure: true,
						action: {
							label: <Text id="buttons.signin" />,
							fn: () => {
								window.location.reload();
							}
						}
					});
					break;
			}
		});
	}
	componentWillReceiveProps({ isOffline }) {
		const { isOffline: prevOffline, refetchAccount } = this.props;
		if (!isOffline && prevOffline !== isOffline) {
			// Refetch anything critical for the App, such as accountInfo
			refetchAccount({
				fetchPolicy: 'network-only'
			});
		}
	}
	componentWillUnmount() {
		removeEventListener('click', this.handleGlobalClick);
		removeEventListener('keydown', this.handleGlobalKeyDown);
		clearInterval(this.keepAliveTimer);
		this.context.zimbraErrorLink.unRegisterAllHandlers();
	}

	render({ nav, showSettings, showAbout, zimletModals, routeProps, matchesScreenMd }) {
		return routeProps.hideHeader ? (
			<div>
				<FaviconWithBadge />
				<Routes onChange={this.routeChanged} />
			</div>
		) : (
			<AppShell>
				<ZimletLoader />
				{showSettings && <SettingsModal />}
				{showAbout && <AboutModal />}
				{Object.keys(zimletModals).map(id => zimletModals[id])}
				<KeyboardShortcutsModal />
				<AttachmentViewer />
				<OfflineDataLoader />
				<ProgressIndicator />

				{nav && <ExternalHeader className={style.hideSmDown} />}
				<Match path="/">{() => <Header className={style.hideSmDown} />}</Match>
				<AppNavigation />
				<Notifications />
				<NotificationModal />

				<Reminders />

				<main class={cx(style.main, !nav && style.noExternalHeader)}>
					<FaviconWithBadge />
					<Routes onChange={this.routeChanged} />
				</main>
				{matchesScreenMd && <BottomSideAdSlots />}
			</AppShell>
		);
	}
}
