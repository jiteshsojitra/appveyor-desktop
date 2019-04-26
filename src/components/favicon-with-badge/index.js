import PureComponent from '../../lib/pure-component';
import Favico from 'favico.js';
import { configure } from '../../config';
import getMailFolders from '../../graphql-decorators/get-mail-folders';
import { connect } from 'preact-redux';
import get from 'lodash-es/get';
import { branch, renderNothing, withPropsOnChange } from 'recompose';

@connect(state => ({
	isOffline: get(state, 'network.isOffline'),
	authTokenExpired: get(state, 'activeAccount.authTokenExpired')
}))
@configure({
	onlineBgColor: 'faviconBadge.onlineBgColor',
	onlineTextColor: 'faviconBadge.onlineTextColor',
	offlineBgColor: 'faviconBadge.offlineBgColor',
	offlineTextColor: 'faviconBadge.offlineTextColor',
	authTimeoutBgColor: 'faviconBadge.authTimeoutBgColor',
	authTimeoutTextColor: 'faviconBadge.authTimeoutTextColor'
})
@getMailFolders()
@branch(({ inboxFolder }) => !inboxFolder, renderNothing)
@withPropsOnChange(
	['isOffline', 'authTokenExpired', 'inboxFolder'],
	({
		onlineBgColor,
		onlineTextColor,
		offlineBgColor,
		offlineTextColor,
		authTimeoutBgColor,
		authTimeoutTextColor,
		isOffline,
		authTokenExpired,
		inboxFolder
	}) => {
		let badgeBgColor,
			badgeTextColor,
			badgeText = inboxFolder.unread || 0;

		if (authTokenExpired) {
			badgeBgColor = authTimeoutBgColor;
			badgeTextColor = authTimeoutTextColor;
			badgeText = '\u2013';
		} else if (isOffline) {
			badgeBgColor = offlineBgColor;
			badgeTextColor = offlineTextColor;
		} else {
			badgeBgColor = onlineBgColor;
			badgeTextColor = onlineTextColor;
		}

		return {
			badgeBgColor,
			badgeTextColor,
			badgeText
		};
	}
)
export default class FaviconWithBadge extends PureComponent {
	faviconInstances = [];

	// Reset all instances of favicon
	resetFavicons = () => this.faviconInstances.forEach(favicon => favicon.reset());

	// Update all favicon instances
	// if isOffline or authTokenExpired props are changed then we have to reinitialize favicons
	// else only update badge number
	updateFavicons = nextProps => {
		if (this.faviconInstances.length <= 0) {
			return;
		}

		const { isOffline, authTokenExpired, inboxFolder } = nextProps;

		// If there is change in offline status or auth token is expired then
		// we have to re-initialize favicons to change colors
		const reInitialize =
			this.props.isOffline !== isOffline || this.props.authTokenExpired !== authTokenExpired;
		const updateCount = this.props.inboxFolder.unread !== inboxFolder.unread;

		if (reInitialize) {
			this.initializeFavicons(nextProps);
		} else if (updateCount) {
			// Only update badge number
			const count = inboxFolder.unread || 0;
			this.faviconInstances.forEach(favicon => favicon.badge(count));
		}
	};

	// Initialize favicon instances
	initializeFavicons = ({ badgeBgColor, badgeTextColor, badgeText }) => {
		this.resetFavicons();

		const faviconLinks = document.querySelectorAll('link[rel=icon]');
		let favicon;

		//Loop through all links and initialise Favico on all of them.
		faviconLinks.forEach(value => {
			favicon = new Favico({
				animation: 'fade',
				bgColor: badgeBgColor,
				textColor: badgeTextColor,
				element: value
			});
			favicon.badge(badgeText);

			this.faviconInstances.push(favicon);
		});
	};

	componentDidMount() {
		this.initializeFavicons(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.updateFavicons(nextProps);
	}

	componentWillUnmount() {
		this.resetFavicons();
	}

	render() {
		return null;
	}
}
