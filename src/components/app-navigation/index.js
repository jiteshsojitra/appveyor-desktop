import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import ToolbarPortalTarget from './toolbar-portal-target';
import MenuItem from '../menu-item';
import ZimletSlot from '../zimlet-slot';
import AppNavigationTabs from './tabs';
import { configure } from '../../config';

import cx from 'classnames';
import style from './style';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { connect } from 'preact-redux';
import * as calendarActionCreators from '../../store/calendar/actions';
import { Icon } from '@zimbra/blocks';
import ContextMenu from '../context-menu';
import { CalendarMainContextMenu } from '../context-menus';
import escapeStringRegexp from 'escape-string-regexp';
import OfflineLabel from '../offline-label';
import s from './style.less';

const MenuItemView = ({ desktopView, slugs, onClick, ...listItem }) => (
	<MenuItem
		key={listItem.name}
		sidebarEnable={!desktopView}
		responsive
		noBorder={!desktopView}
		icon={listItem.icon}
		iconText={listItem.iconText}
		class={cx(style.navMenuItem, !desktopView && style.sidebarNav)}
		href={listItem.href}
		match={`/${slugs[listItem.name]}/`}
		onClick={onClick}
	>
		<Text id={`appNavigation.${listItem.name}`} />
	</MenuItem>
);

@withMediaQuery(minWidth(screenMd), 'desktopView')
@configure('routes.slugs')
@connect(
	state => ({
		url: state.url
	}),
	{
		toggleModal: calendarActionCreators.toggleModal
	}
)
export default class AppNavigation extends Component {
	getNavList = () => {
		const { slugs } = this.props;
		return [
			{
				name: 'email',
				href: '/',
				match: `/${slugs.email}/`,
				icon: 'envelope'
			},
			{
				name: 'contacts',
				href: `/${slugs.contacts}`,
				match: `/${slugs.contacts}/`,
				icon: 'address-book'
			},
			{
				name: 'calendar',
				href: `/${slugs.calendar}`,
				match: `/${slugs.calendar}/`,
				icon: 'calendar-o',
				iconText: new Date().getDate()
			}
		];
	};

	getMatchedItemIndex(list) {
		return list.findIndex(item => item.name === this.props.url.view);
	}

	getPreItems(list) {
		return list.slice(0, this.getMatchedItemIndex(list) + 1);
	}

	getPostItems(list) {
		return list.slice(this.getMatchedItemIndex(list) + 1);
	}

	handleOpenModal = modalType => {
		this.props.toggleModal({
			modalType
		});
	};

	getContextMenu = item => {
		if (item === 'calendar') {
			return <CalendarMainContextMenu openModal={this.handleOpenModal} />;
		}
	};

	isActiveItem = item => {
		if (item === '/calendar') {
			const match = new RegExp('^' + escapeStringRegexp(item));
			return match.test(this.props.url.location.pathname);
		}
		return false;
	};

	renderItem = ({ openContextMenu }) => (
		<Icon name="ellipsis-h" size="sm" onClick={openContextMenu} class={s.contextMenuIcon} />
	);

	render({ slugs, desktopView, renderBefore, renderAfter, onRouteSelect }) {
		const navList = this.getNavList();
		const listItems = renderBefore
			? this.getPreItems(navList)
			: renderAfter
			? this.getPostItems(navList)
			: navList;

		return (
			<div class={style.appMenu}>
				<div
					class={cx(
						!(renderBefore || renderAfter) && style.hideSmDown,
						style.nav,
						!desktopView && style.sidebarNavWrapper
					)}
				>
					{listItems.map(listItem => (
						<div class={style.menuItemWrapper}>
							<MenuItemView
								desktopView={desktopView}
								slugs={slugs}
								onClick={onRouteSelect}
								{...listItem}
							/>
							{!desktopView && this.isActiveItem(`/${slugs[listItem.name]}`) && (
								<ContextMenu
									class={s.contextMenu}
									menu={this.getContextMenu(listItem.name)}
									render={this.renderItem}
								/>
							)}
						</div>
					))}
					{!renderBefore && <ZimletSlot props class={style.slot} name="menu" />}
					{desktopView && <AppNavigationTabs />}
				</div>
				<OfflineLabel />
				<ToolbarPortalTarget />
			</div>
		);
	}
}
