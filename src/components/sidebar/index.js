import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import Portal from 'preact-portal';
import { ContainerSize } from '@zimbra/blocks';
import { empty } from '../../lib/util';
import { screenSmMax } from '../../constants/breakpoints';
import get from 'lodash-es/get';
import cx from 'classnames';
import AppNavigation from '../app-navigation';
import preactRedux from 'preact-redux';
import { bindActionCreators } from 'redux';
import * as sidebarActionCreators from '../../store/sidebar/actions';
import HeaderActions from '../header-actions';
import style from './style';
import ClientLogo from '../client-logo';

const { connect } = preactRedux;

@connect(
	({ sidebar, url, email = {} }) => ({
		url: url.location.pathname,
		account: email.account,
		username: get(email, 'account.name'),
		displayName: get(email, 'account.attrs.displayName'),
		sidebar: sidebar.visible
	}),
	dispatch => bindActionCreators(sidebarActionCreators, dispatch)
)
export default class Sidebar extends PureComponent {
	state = {
		width: window.innerWidth
	};

	onResize = ({ width }) => {
		this.setState({ width });
	};

	closeSidebar = () => {
		this.props.hide();
	};

	// @TODO sidebar would be better triggered via a querystring param
	// for mobile back button support
	componentWillReceiveProps({ url, sidebar }) {
		if (url !== this.props.url && this.props.sidebar && sidebar) {
			this.closeSidebar();
		}
	}

	render(
		{
			header,
			footer,
			children,
			account,
			username,
			displayName,
			sidebar,
			modal,
			show,
			hide,
			...props
		},
		{ width }
	) {
		displayName = displayName || String(username || '').replace(/@.+$/, '');

		// Modal for [0, @screen-md)

		if (typeof modal !== 'boolean') {
			modal = width <= screenSmMax;
		}

		let content = (
			<div
				class={cx(
					style.sidebar,
					modal && style.modal,
					sidebar && style.showing,
					props.class,
					modal && props.modalClass,
					!modal && props.inlineClass
				)}
			>
				<div class={style.backdrop} onClick={hide} />
				<div class={style.inner}>
					{header && (
						<div class={style.header}>
							<div class={style.sidebarLogo}>
								<ClientLogo />
							</div>
							<HeaderActions closeSidebar={this.closeSidebar} />
						</div>
					)}

					{!empty(footer) ? footer : null}
					{modal && <AppNavigation renderBefore onRouteSelect={this.closeSidebar} />}
					<div class={style.content}>{children}</div>
					{modal && <AppNavigation renderAfter onRouteSelect={this.closeSidebar} />}
				</div>
			</div>
		);

		if (modal) {
			content = <Portal into="body">{content}</Portal>;
		}

		content = (
			<ContainerSize
				class={cx(style.wrap, !modal && style.inline)}
				onBeforeResize={this.onResize}
				defer
			>
				{content}
			</ContainerSize>
		);

		return content;
	}
}
