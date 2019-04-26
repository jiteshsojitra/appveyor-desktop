import events from 'mitt';
import apiRequest from '../../api-request';

// See http://replygif.net/about
const API_KEY = '39YAprx5Yi';

function queryToString(queryObj) {
	const params = [`api-key=${API_KEY}`];
	let key;

	for (key in queryObj)
		if (queryObj.hasOwnProperty(key)) {
			params.push(`${key}=${queryObj[key]}`);
		}

	return params.join('&');
}

export default function createReplyGifNetClient(config = {}) {
	const api = events();
	api.request = apiRequest(config.origin || '/@replygif');

	function addThumbs(list) {
		for (let i = list.length; i--; ) {
			list[i].thumbnail = list[i].file.replace('/i/', '/thumbnail/');
		}
		return list;
	}

	/**
	 * Fetch a Gif by ID
	 * @param {Number} id           an ID or comma-seperated-list of IDs
	 * @param {String} tag          limit gifs by a tag
	 * tag - limit gifs by tag terms. Accepts multiple values separated by comma.
	 * tag-operator - use with the tag parameter. Accepts "or", "and" or "not".
	 * reply - limit gifs by reply terms. Accepts multiple values separated by comma.
	 * reply-operator - use with the reply parameter. Accepts "or", "and" or "not".
	 */
	api.gif = function gif(query) {
		query['tag-operator'] = 'or';
		return api.request(`/api/gifs?${queryToString(query)}`).then(addThumbs);
	};

	/**
	 * Fetch a list of Gifs by tag
	 * title - limit tag terms by title. Accepts multiple values separated by comma.
	 * reply - limit tag terms by corresponding reply term. Accepts multiple values separated by comma.
	 * reaction - limit to tag terms categorised as reactions. Accepts only "1" as value.
	 */
	api.tags = function tags(query = {}) {
		return api.request(`/api/tags?${queryToString(query)}`);
	};

	/**
	 * Returns all reply terms and doesn't accept any parameters.
	 * @returns {Promise<Object>}     an Array of all reply terms
	 */
	api.reply = function reply() {
		return api.request(`/api/replies?${API_KEY}`);
	};

	return api;
}
