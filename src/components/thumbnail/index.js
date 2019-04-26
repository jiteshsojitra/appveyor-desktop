import { h, Component } from 'preact';
import DraggableCard from '../draggable-card';

export default class Thumbnail extends Component {
	handleHover = hovered => {
		const { onHover, src } = this.props;

		if (typeof onHover === 'function') {
			onHover(hovered === false ? hovered : src);
		}
	};

	render({ src, thumbnail, alt, ...props }) {
		delete props.onHover;
		thumbnail = thumbnail || src;
		return (
			<DraggableCard
				{...props}
				onHover={this.handleHover}
				style={{
					backgroundImage: thumbnail && `url(${thumbnail})`,
					backgroundPosition: 'center',
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat'
				}}
			/>
		);
	}
}
