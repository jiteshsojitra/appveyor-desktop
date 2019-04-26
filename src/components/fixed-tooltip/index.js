import { h } from 'preact';

const defaultProps = {
	container: document.body,
	origin: {
		x: 0,
		y: 0
	},
	transformOrigin: {
		x: 0,
		y: -144
	}
};

/**
 * A fixed position tooltip that always opens towards the center of props.container
 */
export default function FixedTooltip({
	origin = defaultProps.origin,
	transformOrigin = defaultProps.transformOrigin,
	container = defaultProps.container,
	...props
}) {
	let y = origin.y + transformOrigin.y;
	let x = origin.x + transformOrigin.x;
	let leftOrRight = 'left';
	let topOrBottom = 'top';
	let { clientHeight, clientWidth } = container;

	clientHeight += transformOrigin.y;
	clientWidth += transformOrigin.x;

	if (y > clientHeight / 2) {
		y = clientHeight - y;
		topOrBottom = 'bottom';
	}
	if (x > clientWidth / 2) {
		x = clientWidth - x;
		leftOrRight = 'right';
	}
	return (
		<div
			{...props}
			style={`position: fixed; ${topOrBottom}: ${y}px; ${leftOrRight}: ${x}px; z-index: 100;`}
		/>
	);
}
