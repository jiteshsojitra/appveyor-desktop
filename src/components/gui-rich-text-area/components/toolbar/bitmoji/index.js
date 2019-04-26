import { h, Component } from 'preact';
import cx from 'classnames';
import { configure } from '../../../../../config';
import { initSnap } from '../../../../../lib/util';

import styles from '../style';

@configure('zimbraOrigin,snapchatApp')
export class BitmojiMenu extends Component {
	onStickerPickCallback = renderURL => {
		this.props.onBitmojiSelect(renderURL);
	};

	bitmojiIconClass = 'bitmojiMenu';

	mountBitmojiStickerPickerUIWithParams = () => {
		initSnap().then(snap => {
			const { snapchatApp } = this.props;

			const uiOptions = {
				onStickerPickCallback: this.onStickerPickCallback,
				iconOverride: { size: 24, style: 'Customizable' }
			};

			const loginParams = {
				clientId: snapchatApp.clientId,
				scopeList: [
					'https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar',
					'https://auth.snapchat.com/oauth2/api/user.display_name'
				],
				redirectURI: snapchatApp.redirectURI
			};

			const decodedCookie = decodeURIComponent(document.cookie);
			const splitReadCookie = decodedCookie.split(';');
			const accessCookie = splitReadCookie
				.filter(item => {
					const value = item.trim().split('=');
					return value[0] === 'access_token';
				})
				.map(item => item.split('=')[1]);

			if (accessCookie.length > 0) {
				snap.bitmojikit.mountBitmojiStickerPickerIcons(
					this.bitmojiIconClass,
					uiOptions,
					loginParams,
					accessCookie[0]
				);
			} else {
				snap.bitmojikit.mountBitmojiStickerPickerIcons(
					this.bitmojiIconClass,
					uiOptions,
					loginParams
				);
			}
		});
	};

	componentDidMount() {
		this.mountBitmojiStickerPickerUIWithParams();
		addEventListener('focus', this.mountBitmojiStickerPickerUIWithParams);
	}

	shouldComponentUpdate() {
		return false;
	}

	componentDidUpdate() {
		this.mountBitmojiStickerPickerUIWithParams();
	}

	componentWillUnmount() {
		removeEventListener('focus', this.mountBitmojiStickerPickerUIWithParams);
	}

	render() {
		return <div class={cx(this.bitmojiIconClass, styles.toolbarButton)} />;
	}
}
