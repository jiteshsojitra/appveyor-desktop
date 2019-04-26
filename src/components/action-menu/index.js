import { h, Component, cloneElement } from 'preact';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Popover, Icon } from '@zimbra/blocks';
import ActionButton from '../action-button';

import s from './style.less';

/* Utility function for children of ActionMenu that just want to be wrapped in a div and close the drop-down when clicked
 * typically called like:

	<ActionMenu>
		<DropDownWrapper>
			<MyActualContentOfDropDownMenu/>
		</DropDownWrapper>
	</ActionMenu>
*/
export function DropDownWrapper({ closeDropdown, children }) {
	return <div onClick={closeDropdown}>{children}</div>;
}

export default class ActionMenu extends Component {
	state = {
		active: false
	};

	handleCloseDropdwon = () => {
		this.setState({ active: false });
	};

	handleToggleDropdown = () => {
		const active = !this.state.active;
		this.setState({ active });
		this.props.onToggle(active);
	};

	static propTypes = {
		button: PropTypes.node.isRequired,
		children: PropTypes.arrayOf(PropTypes.func).isRequired,
		onToggle: PropTypes.func
	};

	static defaultProps = {
		onToggle: () => {},
		arrowSize: 'xs'
	};

	hideWhenDisabled = disabled => {
		this.state.active && disabled && this.setState({ active: false });
	};

	componentWillMount() {
		this.hideWhenDisabled(this.props.disabled);
	}

	componentWillReceiveProps({ disabled }) {
		this.hideWhenDisabled(disabled);
	}

	render(
		{
			label,
			icon,
			iconOnly,
			children,
			disabled,
			arrow,
			corners,
			renderLabel,
			popoverClass,
			toggleClass,
			actionButtonClass,
			iconClass,
			iconSize,
			arrowSize,
			monotone,
			...rest
		},
		{ active }
	) {
		return (
			<Popover
				{...rest}
				active={active}
				disabled={disabled}
				text={
					typeof renderLabel === 'function'
						? renderLabel({ toggle: this.handleToggleDropdown })
						: renderLabel || (
								<ActionButton
									className={actionButtonClass}
									iconClass={iconClass}
									icon={icon}
									iconSize={iconSize}
									disabled={disabled}
									monotone={monotone}
								>
									{(!iconOnly || arrow !== false) && (
										<span class={s.text}>
											{!iconOnly && <span class={s.label}>{label}</span>}
											{arrow !== false && [' ', <Icon name="angle-down" size={arrowSize} />]}
										</span>
									)}
								</ActionButton>
						  )
				}
				onToggle={this.handleToggleDropdown}
				anchor={rest.anchor || 'start'}
				corners={corners || 'bottom'}
				classes={{
					toggleClass,
					containerClass: cx(s.popover, rest.class)
				}}
				class={cx(s.popover, rest.class)}
				toggleClass={s.toggle}
				popoverClass={cx(s.dropdown, popoverClass)}
			>
				{active && cloneElement(children[0], { closeDropdown: this.handleCloseDropdwon })}
			</Popover>
		);
	}
}
