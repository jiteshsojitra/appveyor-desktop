import { h, Component } from 'preact';

export default class BitmojiAuth extends Component {
	getSearchQueryFromUrl = () => {
		const hash = window.location.hash.substring(1);
		const params = {};
		hash.split('&').map(hk => {
			const temp = hk.split('=');
			params[temp[0]] = temp[1];
		});

		document.cookie = 'access_token=' + params['access_token'];
		return params['access_token'];
	};

	render() {
		this.getSearchQueryFromUrl();
		window.close();
		return <div />;
	}
}
