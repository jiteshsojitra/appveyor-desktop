import { h, Component } from 'preact';
import cx from 'classnames';
import PropTypes from 'prop-types';

import { featureDetectTouch } from '../../utils/feature-detection';

import s from './style.less';

const isTouchEnabledDevice = featureDetectTouch();

export default class PreviewResizeControl extends Component {
	state = {
		isMoving: false,
		start: 0
	};

	getCoord = (e, axis) => {
		const coordPoint = isTouchEnabledDevice
			? (e.targetTouches.length && e.targetTouches[0]) ||
			  (e.changedTouches.length && e.changedTouches[0])
			: e;
		return coordPoint[`page${axis}`] || coordPoint[`client${axis}`];
	};

	offset = e =>
		(this.props.horizontalResizer ? this.getCoord(e, 'X') : this.getCoord(e, 'Y')) -
		this.state.start;

	handleResizeStart = e => {
		if (!isTouchEnabledDevice && e.button !== 0) {
			return;
		}

		const start = this.props.horizontalResizer ? this.getCoord(e, 'X') : this.getCoord(e, 'Y');

		this.setState({ start, isMoving: true });
		this.props.onDragStart(start, this.props.horizontalResizer);
		document.addEventListener(
			isTouchEnabledDevice ? 'touchmove' : 'mousemove',
			this.handleResizeMove
		);
		document.addEventListener(isTouchEnabledDevice ? 'touchend' : 'mouseup', this.handleResizeStop);
	};

	handleResizeStop = e => {
		document.removeEventListener(
			isTouchEnabledDevice ? 'touchmove' : 'mousemove',
			this.handleResizeMove
		);
		document.removeEventListener(
			isTouchEnabledDevice ? 'touchend' : 'mouseup',
			this.handleResizeStop
		);
		this.setState({ start: 0, isMoving: false });
		this.props.onDragEnd(this.offset(e), this.props.horizontalResizer);
	};

	handleResizeMove = e => {
		/**
		 * e.preventDefault() is disabled for now on touch devices
		 * because of https://stackoverflow.com/questions/42101723/unable-to-preventdefault-inside-passive-event-listener
		 */
		!isTouchEnabledDevice && e.preventDefault();
		this.props.onDrag(this.offset(e), this.props.horizontalResizer);
	};

	static propTypes = {
		onDragStart: PropTypes.func,
		onDrag: PropTypes.func,
		onDragEnd: PropTypes.func
	};

	render({ horizontalResizer }, { style, isMoving }) {
		return (
			<div
				class={cx(
					s.previewResizeControl,
					isMoving && s.moving,
					horizontalResizer ? s.verticalResizeControl : s.horizontalResizeControl
				)}
				onTouchStart={isTouchEnabledDevice && this.handleResizeStart}
				onMouseDown={!isTouchEnabledDevice && this.handleResizeStart}
				style={style}
			>
				<div class={s.visibleBar} />
				<div class={s.hiddenBar} />
			</div>
		);
	}
}
