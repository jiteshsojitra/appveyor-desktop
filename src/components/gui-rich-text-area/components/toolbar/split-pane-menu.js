import { h, Component } from 'preact';
import { Popover, Icon } from '@zimbra/blocks';
import { Text, Localizer } from 'preact-i18n';
import Item from '../../../menu-item';
import cx from 'classnames';
import styles from './style';

export class SplitPaneMenu extends Component {
	state = {
		active: false
	};

	handleSelection = selectedOption => {
		this.setState({ active: false });
		this.props.onChange(selectedOption);
	};

	handleTogglePopover = active => {
		this.setState({ active });
	};

	renderSubMenuPane = submenu => (
		<div class={cx(styles.pane, submenu.class)}>
			{submenu.heading && (
				<h3 class={styles.paneHeading}>
					<Text id={`compose.toolbar.${submenu.heading}`} />
				</h3>
			)}
			{submenu.menuItems.map(option => (
				<PopoverItem
					item={option}
					currentCommandValue={this.props.commandState && this.props.commandState[submenu.command]}
					onClick={this.handleSelection}
				/>
			))}
		</div>
	);

	render({ menuIcon, submenu, title }, { active }) {
		return (
			<Localizer>
				<Popover
					active={active}
					onToggle={this.handleTogglePopover}
					anchor="start"
					class={styles.submenuWrapper}
					toggleClass={cx(styles.toggle, styles.toolbarButton)}
					text={<Icon name={menuIcon} />}
					tooltip={<Text id={`compose.toolbar.${title}`} />}
				>
					{submenu.map(this.renderSubMenuPane)}
				</Popover>
			</Localizer>
		);
	}
}

class PopoverItem extends Component {
	handleTap = e => {
		this.props.onClick(this.props.item);
		this.cancel(e);
	};

	cancel(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	render = ({ item, currentCommandValue }) => (
		<Item class={cx(styles.paneItem, item.class)} style={item.style} onMouseDown={this.handleTap}>
			{currentCommandValue && currentCommandValue === String(item.value) && (
				<Icon class={styles.selectedItem} name="check" />
			)}
			<Text id={`compose.toolbar.${item.label}`} />
		</Item>
	);
}
