import { h, Component, cloneElement } from 'preact';
import cx from 'classnames';
import throttle from 'lodash-es/throttle';
import Portal from 'preact-portal';

import { ClickOutsideDetector } from '@zimbra/blocks';

import s from './style.less';

/**
 * `FixedPopover` implements a `position: fixed` popover with outside click handling
 * that works similar to absolute positioning, but circumvents some of the issues
 * when rendering absolutely positioned elements in certain types of containers.
 */
export default class FixedPopover extends Component {
	state = {
		isOpen: false,
		left: null,
		right: null,
		top: null,
		bottom: null
	};

	handlePositioning = (e, preventDefault = true) => {
		const { useRectPositioning, popover } = this.props;
		const { left, top, isOpen } = this.state;

		// Allow a user access to the system menu when invoking the menu twice
		// in the same location.
		if ((isOpen && e.pageX === left && e.pageY === top) || !popover) {
			return;
		}

		if (preventDefault) {
			e.preventDefault && e.preventDefault();
			e.stopPropagation && e.stopPropagation();
		}

		const rect = this.container.getBoundingClientRect();
		let state = {};

		if (window.innerHeight - e.pageY < window.innerHeight / 2) {
			state = {
				...state,
				bottom: window.innerHeight - (useRectPositioning ? rect.top : e.pageY),
				top: null
			};
		} else {
			state = {
				...state,
				top: useRectPositioning ? rect.bottom : e.pageY,
				bottom: null
			};
		}

		if (window.innerWidth - e.pageX < window.innerWidth / 2) {
			state = {
				...state,
				right: window.innerWidth - (useRectPositioning ? rect.left : e.pageX),
				left: null
			};
		} else {
			state = {
				...state,
				left: useRectPositioning ? rect.left : e.pageX,
				right: null
			};
		}

		this.setState({
			isOpen: true,
			...state
		});
	};

	queueHandlePositioning = throttle(e => {
		if (this.props.enableScroll && this.state.isOpen) {
			if (
				this.container &&
				this.container.offsetTop + this.container.offsetHeight < e.target.scrollTop
			) {
				// Close the popover if the element scrolls (UPWARDS ONLY) out of view.
				this.setState({ isOpen: false });
			} else {
				this.handlePositioning(e, false);
			}
		}
	}, 20);

	handleOutsideClick = e => {
		if (this.container.contains(e.target)) {
			return;
		}

		this.setState({ isOpen: false });
	};

	handlePopoverClick = () => {
		this.setState({ isOpen: false });
	};

	handleClose = () => {
		this.setState({ isOpen: false });
	};

	handleBackdropClick = e => {
		if (this.backdrop === e.target) {
			this.setState({ isOpen: false });
		}
	};

	handleBackdropMouseDown = e => {
		if (e.which === 3) {
			this.handleBackdropClick(e);
		}
	};

	static defaultProps = {
		enableClick: true,
		enableContextMenu: false,
		disabled: false,
		persistent: false,
		popoverProps: {},
		useRectPositioning: false,
		disableBackdrop: false
	};

	componentWillMount() {
		document.addEventListener('scroll', this.queueHandlePositioning, {
			capture: true,
			passive: true
		});
	}

	componentWillUnmount() {
		document.removeEventListener('scroll', this.queueHandlePositioning, {
			capture: true,
			passive: true
		});
	}

	render(
		{
			disableBackdrop,
			enableScroll,
			enableClick,
			enableContextMenu,
			render,
			children,
			popover,
			popoverClass,
			popoverProps,
			disabled,
			persistent,
			isPopover,
			propagateClicks,
			useRectPositioning,
			...rest
		},
		{ isOpen, left, top, bottom, right }
	) {
		if (disabled) {
			return children && children[0];
		}

		return (
			<div
				{...rest}
				class={cx(s.contextMenu, rest.class)}
				onClick={enableClick && this.handlePositioning}
				onContextMenu={enableContextMenu && this.handlePositioning}
				ref={ref => (this.container = ref)}
			>
				{render
					? render({
							isOpen,
							close: this.handleClose,
							open: this.handlePositioning,
							openContextMenu: this.handlePositioning,
							...rest
					  })
					: children}

				{isOpen && popover && (
					<Portal into="body">
						<div
							class={!disableBackdrop && s.backdrop}
							onMouseDown={this.handleBackdropMouseDown}
							onClick={this.handleBackdropClick}
							ref={ref => (this.backdrop = ref)}
						>
							<ClickOutsideDetector onClickOutside={this.handleOutsideClick}>
								<div
									{...popoverProps}
									class={cx(s.popover, isPopover && (top ? s.isAbove : s.isBelow), popoverClass)}
									style={{
										...(left ? { left } : {}),
										...(right ? { right } : {}),
										...(top ? { top } : {}),
										...(bottom ? { bottom } : {})
									}}
									onClick={persistent ? null : this.handlePopoverClick}
								>
									{typeof popover === 'function'
										? popover({ onClose: this.handleClose })
										: cloneElement(popover, { onClose: this.handleClose })}
								</div>
							</ClickOutsideDetector>
						</div>
					</Portal>
				)}
			</div>
		);
	}
}
