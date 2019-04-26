import { h, Component } from 'preact';
import { IntlProvider } from 'preact-i18n';
import { withProps } from 'recompose';
import get from 'lodash-es/get';
import Loader from '../components/app-shell-loader';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../constants/locale';
import moment from 'moment';

const localeMap = {
	en: 'en-us',
	fr: 'fr-fr'
};

export default function withIntlWrapper() {
	const isSupportedLocale = locale => {
		// Normalize locale so it will be easier for comparison
		locale = normalizeLocale(locale);

		// Check for supported locales, ie en_US
		if (SUPPORTED_LOCALES.find(el => normalizeLocale(el) === locale)) {
			return true;
		}

		// Some browsers gives fr locale when french is selected instead of fr_FR
		// So check mapping first and change locale code based on that
		if (localeMap[locale]) {
			return true;
		}
	};

	// Locale name has differences between browser and zimbra server, so normalize it
	const normalizeLocale = locale => locale.toLowerCase().replace('_', '-');

	return function(Child) {
		@withProps(({ account }) => {
			const prefLocale = get(account, 'prefs.zimbraPrefLocale');
			let locale = (
				(prefLocale && [].concat(prefLocale)) ||
				navigator.languages ||
				[].concat(navigator.language)
			).find(isSupportedLocale);

			if (localeMap[locale]) {
				locale = localeMap[locale];
			}

			// If we don't have any supported locale then use default locale
			if (!locale) locale = DEFAULT_LOCALE;

			return {
				defaultLocale: normalizeLocale(DEFAULT_LOCALE),
				locale: normalizeLocale(locale)
			};
		})
		class IntlWrapper extends Component {
			state = {
				definition: null,
				defaultDefinition: null,
				momentLocale: null
			};

			importLocale = locale =>
				import(
					/* webpackMode: "lazy" */
					/* webpackChunkName: "locale-[request]"*/
					`../intl/${locale}.json`
				).then(({ default: definition }) => definition);

			importMomentLocale = locale => {
				// In case of en_US, we don't need to load moment locale as it is already part of default package
				if (locale === this.props.defaultLocale) {
					return Promise.resolve(locale.split('-')[0]);
				}

				return import(`moment/src/locale/${locale}`)
					.catch(() => {
						console.warn(`Error loading moment locale for ${locale}`);

						const langCode = locale.split('-')[0];
						return import(`moment/src/locale/${langCode}`).then(() => langCode);
					})
					.then(() => locale);
			};

			loadLocale = ({ locale, defaultLocale }, loadDefaultLocale) => {
				const allPromises = [];

				// Remove current state values, so we can show a loader while we load locale files
				this.setState({
					definition: null,
					momentLocale: null
				});

				// Load en_US locale which will be used as fallback strings,
				// when particular locale doesn't have all strings
				allPromises.push(loadDefaultLocale && this.importLocale(defaultLocale));

				// If passed locale is same as default locale then no need to do anything extra
				if (locale !== defaultLocale) {
					// Load locale, containing all translated strings
					allPromises.push(this.importLocale(locale));

					// Load moment locale
					allPromises.push(this.importMomentLocale(locale));
				}

				Promise.all(allPromises)
					.then(
						([
							defaultDefinition,
							definition = null,
							momentLocale = defaultLocale.split('-')[0]
						]) => {
							// Put definition object in state which will be passed to child component
							this.setState({
								definition,
								...(loadDefaultLocale && { defaultDefinition }),
								momentLocale
							});
						}
					)
					.catch(() => console.error(`Error loading translations for ${locale}`));
			};

			componentWillMount() {
				this.loadLocale(this.props, true);
			}

			componentWillReceiveProps(nextProps) {
				const nextLocale = nextProps.locale,
					locale = this.props.locale;

				// check if the active locale has changed, then fetch & apply the corresponding locale data.
				if (nextLocale !== locale) {
					this.loadLocale(nextProps);
				}
			}

			render(props, { definition, defaultDefinition, momentLocale }) {
				// momentLocale is only set in state after loading all locale files
				if (!momentLocale) {
					return <Loader />;
				}

				// Set moment locale globally
				moment.locale(momentLocale);

				return (
					<IntlProvider definition={definition}>
						<IntlProvider definition={defaultDefinition}>
							<Child {...props} />
						</IntlProvider>
					</IntlProvider>
				);
			}
		}

		return IntlWrapper;
	};
}
