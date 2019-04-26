import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import get from 'lodash-es/get';
import gql from 'graphql-tag';
import { hasFlag } from '../lib/util';
import { selectionSetFromObject } from '../graphql/utils/graphql';
import { htmlToText } from '../lib/html-email';
import { types as apiTypes, CacheType } from '@zimbra/api-client';
import lunr from 'lunr';
import { getCacheByType } from '../utils/in-memory-cache';
import { MAIL_VIEW } from '../constants/views';

const { MessageFlags } = apiTypes;

/**
 * Flatten an emailAddresses object into a string that can be indexed.
 * (See types in @zimbra/api-client)
 * @param {AddressType} type
 * @param {String} field                  the field to flatten (e.g. displayName, address)
 * @param {Function} [mapFieldToString]   a function to transform the token before adding it to the indexed string
 * @returns {Function}                    an extractor function for lunr.js
 */
function tokenizeEmailAddresses(type, field, mapTokenToStr = String) {
	return message =>
		message.emailAddresses &&
		message.emailAddresses
			.filter(address => address.type === type && address[field])
			.map(address => mapTokenToStr(address[field]))
			.join(' ');
}

/**
 * Create an instance of lunr which prepares cached index specially for emails which
 * can be searched offline.
 *
 * @param {ApolloClient} client An Apollo instance which manage the cache
 * @returns {lunr} The lunr index for cached mail items
 */
function createLunrIndexForMail(client) {
	const cache = getCacheByType(client, CacheType.network);
	return lunr(function createMessageIndex() {
		this.field('body', {
			extractor: message => (message.html ? htmlToText(message.html) : message.excerpt)
		});

		this.field('subject');

		this.field('attachment', {
			extractor: message => hasFlag(message, MessageFlags.hasAttachment)
		});

		// Index all email addresses based on name, email address, and domain name.
		[['to', 't'], ['from', 'f'], ['cc', 'c'], ['bcc', 'b']].forEach(([senderType, property]) => {
			this.field(`${senderType}DisplayNames`, {
				extractor: tokenizeEmailAddresses(property, 'displayName')
			});
			this.field(`${senderType}Addresses`, {
				extractor: tokenizeEmailAddresses(property, 'address', address => address.split('@')[0])
			});
			this.field(`${senderType}Domains`, {
				extractor: tokenizeEmailAddresses(property, 'address', address => address.split('@')[1])
			});
		});

		const rawCacheData = cache && get(cache, 'data.data');
		if (rawCacheData) {
			Object.keys(rawCacheData)
				// Filter all `MessageInfo` dataIds in the cache.
				.filter(key => /MessageInfo:\d+$/.test(key))
				// Read all of the keys found in the cache and add the message to the index
				.forEach(id => {
					this.add(
						client.readFragment({
							id,
							fragment: gql`
								fragment indexedMessageFields on MessageInfo {
									${selectionSetFromObject(cache, rawCacheData[id])}
								}
							`
						})
					);
				});
		}
	});
}

/**
 * Create an instance of lunr which prepares cached index specially for contacts which
 * can be searched offline to populate auto-suggestions while composing an email.
 * Currently this is restricted to cache personal contacts only
 *
 * @param {ApolloClient} client An Apollo instance which manage the cache
 * @returns {lunr} The lunr index for cached mail items
 */
function createLunrIndexForContact(client) {
	const cache = getCacheByType(client, CacheType.network);
	return lunr(function createContactIndex() {
		this.field('email', { extractor: contact => contact.attributes.email });
		this.field('fullName', { extractor: contact => contact.attributes.fullName });

		const rawCacheData = cache && get(cache, 'data.data');
		if (rawCacheData) {
			Object.keys(rawCacheData)
				// Read matching keys from cache and add them to the index
				.forEach(id => {
					/Contact:\d+$/.test(id) &&
						this.add(
							client.readFragment({
								id,
								fragment: gql`
								fragment indexedContactFields on Contact {
									${selectionSetFromObject(cache, rawCacheData[id])}
								}
							`
							})
						);
				});
		}
	});
}

/**
 * Provides lunr indexed mails/contacts.
 *
 * @param {String} type Specify either mail or contact needs to be cached.
 * @returns {Function} Wrapper which helps to supply additional parameters.
 */
export default function withLunrIndex(type) {
	return function wrapperFn(Child) {
		return connect(state => ({ isOffline: state.network.isOffline }))(
			class WithLunrIndex extends Component {
				componentWillMount() {
					this.setState({
						lunrIndex:
							type === MAIL_VIEW
								? createLunrIndexForMail(this.context.client)
								: createLunrIndexForContact(this.context.client)
					});
				}

				componentWillReceiveProps({ isOffline }) {
					if (this.props.isOffline !== isOffline) {
						// Clear the mail index when we go online.
						!isOffline && this.state.cachedIndex && this.setState({ lunrIndex: undefined });
					} else if (isOffline && !this.state.cachedIndex) {
						// Create the mail index when we go offline
						this.setState({
							lunrIndex:
								type === MAIL_VIEW
									? createLunrIndexForMail(this.context.client)
									: createLunrIndexForContact(this.context.client)
						});
					}
				}

				render(props, { lunrIndex }) {
					if (process.env.NODE_ENV !== 'production') {
						window.__lunr = window.__lunr || {};
						window.__lunr[type] = lunrIndex;
					}
					return <Child {...props} lunrIndex={lunrIndex} />;
				}
			}
		);
	};
}
