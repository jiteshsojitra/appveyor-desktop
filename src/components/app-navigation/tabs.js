import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { getCurrentUrl, route } from 'preact-router';
import { Text } from 'preact-i18n';

import { removeTab, removeAllTabs } from '../../store/navigation/actions';

import { Icon } from '@zimbra/blocks';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuItem from '../action-menu-item';
import ActionMenuGroup from '../action-menu-group';
import MenuItem from '../menu-item';
import { configure } from '../../config';

import s from './style.less';
@configure('routes.slugs')
class Tab extends Component {
	handleCloseClick = e => {
		const { tab, tabs } = this.props;
		e.preventDefault();
		e.stopPropagation();

		if (getCurrentUrl() === tab.url) {
			const index = tabs.indexOf(tab);
			if (index > -1 && tabs.length - 1 > index) {
				route(tabs[index + 1].url);
			} else if (index > 0) {
				route(tabs[index - 1].url);
			} else if (tab.type === 'search') {
				const regexCal = new RegExp(`^/search/${this.props.slugs.calendar}/`, 'i');
				const regexCont = new RegExp(`^/search/${this.props.slugs.contacts}/`, 'i');

				if (regexCal.test(tab.url)) {
					route('/' + this.props.slugs.calendar);
				} else if (regexCont.test(tab.url)) {
					route('/' + this.props.slugs.contacts);
				} else {
					route('/');
				}
			} else {
				route('/');
			}
		}
		this.props.removeTab(tab);
	};

	static defaultProps = {
		MenuItemComponent: MenuItem
	};

	render({ tab, MenuItemComponent, class: cls }) {
		return (
			<MenuItemComponent
				href={tab.url}
				match={tab.url}
				title={tab.title}
				class={cls}
				activeClass={s.active}
				responsive
			>
				<div class={s.tab}>
					<div class={s.tabTitle}>{tab.title}</div>
					<Icon name="close" size="sm" class={s.tabClose} onClick={this.handleCloseClick} />
				</div>
			</MenuItemComponent>
		);
	}
}

@connect(
	state => ({
		tabs: state.navigation.tabs
	}),
	{
		removeTab,
		removeAllTabs
	}
)
export default class AppNavigationTabs extends Component {
	handleCloseAll = () => {
		const { tabs } = this.props;
		const onTab = tabs.map(t => t.url).indexOf(getCurrentUrl()) > -1;

		this.props.removeAllTabs();

		if (onTab) {
			route('/');
		}
	};

	render({ tabs }) {
		return (
			<div class={s.tabs}>
				{tabs.map(tab => (
					<div class={s.tabMenuItemWrapper}>
						<Tab class={s.tabMenuItem} tab={tab} tabs={tabs} removeTab={this.props.removeTab} />
					</div>
				))}

				{tabs.length > 0 && (
					<ActionMenu
						class={s.tabsDropdown}
						popoverClass={s.tabsDropdownPopover}
						toggleClass={s.tabsDropdownToggle}
						arrowSize="xs"
						anchor="end"
						iconOnly
					>
						<DropDownWrapper>
							<ActionMenuGroup class={s.dropdownTabList}>
								{tabs.map(tab => (
									<Tab
										class={s.tabDropdownMenuItem}
										tab={tab}
										tabs={tabs}
										MenuItemComponent={ActionMenuItem}
										removeTab={this.props.removeTab}
									/>
								))}
							</ActionMenuGroup>
							<ActionMenuGroup>
								<ActionMenuItem onClick={this.handleCloseAll} class={s.tabsCloseAll}>
									<Icon name="close" size="sm" class={s.tabsCloseAllIcon} />
									<Text id="navigation.closeAllTabs" />
								</ActionMenuItem>
							</ActionMenuGroup>
						</DropDownWrapper>
					</ActionMenu>
				)}
			</div>
		);
	}
}
