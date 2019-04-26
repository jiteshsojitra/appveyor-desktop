import { h, Component } from 'preact';
import { Card } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import { bindActionCreators } from 'redux';
import { absoluteUrl } from '../../lib/util';
import { setDragData } from '../../store/dragdrop/actions';

// A worthwhile composition? Or should just hoist the <Card> out of blocks and into main package.

@connect(
	null,
	bindActionCreators.bind(null, { setDragData })
)
export default class DraggableCard extends Component {
	handleDragStart = e => {
		const { onDragStart, data = {} } = this.props;

		// Firefox bug - https://bugzilla.mozilla.org/show_bug.cgi?id=725156
		// Drag and drop does not proceed unless a dragstart handler sets data
		e.dataTransfer.setData('text', data.name || '!');

		if (data.url || data.href) {
			e.dataTransfer.setData('URL', absoluteUrl(data.url || data.href));
		}

		if (typeof this.props.setDragData !== 'undefined') {
			this.props.setDragData(data);
		}

		if (typeof onDragStart !== 'undefined') {
			onDragStart(e);
		}
	};

	static defaultProps = {
		draggable: true
	};

	render({ data, ...props }) {
		if (props.draggable === true) {
			props.onDragStart = this.handleDragStart;
		}

		return <Card {...props} />;
	}
}
