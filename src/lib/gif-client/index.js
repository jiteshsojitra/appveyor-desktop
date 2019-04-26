import events from 'mitt';
import createGiphyClient from './giphy.com-client';

export default function gifClient(config = {}) {
	const api = events();

	// if we don't have an api key then don't try the integration
	if (!config.giphyKey) {
		return api;
	}

	// Giphy Integration!
	const giphyClient = createGiphyClient(config);

	api.getGifsByTag = giphyClient.search;

	return api;
}
