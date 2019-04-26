import { Component } from 'preact';
import { connect } from 'preact-redux';
import * as actions from '../store/dragdrop/actions';

// Check if a DataTransfer.types collection contains a given String, case-insensitively
function hasType(types, type) {
	if (types) {
		for (let i = types.length; i--; ) {
			if (String(types[i]).toLowerCase() === type) {
				return true;
			}
		}
	}
}

/**
 * A side-effect component which attaches its event handlers at most once.
 */
@connect(
	({ dragdrop }) => dragdrop,
	{ setDragging: actions.setDragging }
)
export default class DropTargetDetector extends Component {
	static mountCount = 0;

	//dragEnter and dragLeave events can be triggered for children of the main event capturing area
	//keep track of how many dragEnter/dragLeave events we have seen.  When the balance is 0, we are not dragging over the event area
	static dragEnterCounter = 0;

	handleMouseMove = e => {
		if (this.props.isDragging && e.buttons === 0) {
			// Always hide drop targets if the mouse moves while no mouse buttons are clicked.
			this.handleDragEnd();
		}
	};

	handleDrop = e => {
		e.preventDefault(); // Prevent the browser from opening the file itself as a `file://` URL
		e.stopPropagation(); // Prevent the RichTextEditor from handling the drop because we got this already
		this.handleDragEnd();
	};

	handleDragOver = e => {
		e.preventDefault(); // Prevent the browser from opening the file itself as a `file://` URL
	};

	handleDragEnter = e => {
		DropTargetDetector.dragEnterCounter++;
		const { data, isDragging, setDragging } = this.props;

		if (!isDragging) {
			DropTargetDetector.dragEnterCounter = 1;
			const types = e.dataTransfer && e.dataTransfer.types;
			if (setDragging && (hasType(types, 'files') || data != null)) {
				setDragging(true);
			}
		}
	};

	handleDragLeave = () => {
		DropTargetDetector.dragEnterCounter--;
		!DropTargetDetector.dragEnterCounter && this.handleDragEnd();
	};

	handleDragEnd = () => {
		DropTargetDetector.dragEnterCounter = 0;
		this.props.setDragging(false);
	};

	componentWillMount() {
		DropTargetDetector.mountCount += 1;

		if (DropTargetDetector.mountCount === 1) {
			addEventListener('drop', this.handleDrop);
			addEventListener('dragover', this.handleDragOver);
			addEventListener('dragenter', this.handleDragEnter);
			addEventListener('dragleave', this.handleDragLeave);
			addEventListener('mousemove', this.handleMouseMove);
		}
	}

	componentWillUnmount() {
		DropTargetDetector.mountCount -= 1;

		if (DropTargetDetector.mountCount === 0) {
			removeEventListener('drop', this.handleDrop);
			removeEventListener('dragover', this.handleDragOver);
			removeEventListener('dragenter', this.handleDragEnter);
			removeEventListener('dragleave', this.handleDragLeave);
			removeEventListener('mousemove', this.handleMouseMove);
		}
	}
}
