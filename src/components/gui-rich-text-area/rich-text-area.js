import { h, Component } from 'preact';
import { moveSelectionOutOfNonEditableArea } from '../../lib/html-email';
import { MAX_RANGE_REUSES } from '../../constants/rich-text-area';
import sanitize, { doSanitize } from '../../lib/html-viewer/sanitize';
import { ensureCssReset } from '../../lib/html-viewer';

//regex list of tags, that if present in the body will hide the placeholder text if no other text is in the body
const HIDE_PLACEHOLDER_REGEX = /<(?:img|li)/i;

function moveChildren(oldParent, newParent, skip) {
	let child = oldParent.firstChild;
	while (child) {
		const next = child.nextSibling;
		if (child !== skip) {
			newParent.appendChild(child);
		}
		child = next;
	}
}

export default class RichTextArea extends Component {
	getBase = () => this.base;

	focus = () => {
		this.base.focus();
	};

	blur = () => {
		this.base.blur();
	};

	restoreRange = () => {
		this.base.focus();
		// As a failsafe, only reuse the same saved range up to 3 times.
		if (this.range && this.rangeUses < MAX_RANGE_REUSES) {
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(this.range);
			this.rangeUses++;
		}
	};

	saveRange = () => {
		const selection = window.getSelection();
		if (selection.getRangeAt && selection.rangeCount) {
			this.range = selection.getRangeAt(0);
			this.rangeUses = 0;
		}
	};

	handleSelectionChange = e => {
		moveSelectionOutOfNonEditableArea(this.base);

		if (e.target.activeElement === this.base) {
			// Always save the range after selection changes inside base
			this.saveRange();
		}
	};

	handleFocusIn = e => {
		this.restoreRange();
		this.handleEvent(e);
	};

	handleEvent = e => {
		const type = 'on' + e.type.toLowerCase();
		this.eventValue = this.base.innerHTML;
		this.eventValueTime = Date.now();
		this.updatePlaceholder();
		e.value = this.eventValue;
		for (const i in this.props) {
			if (this.props.hasOwnProperty(i) && i.toLowerCase() === type) {
				this.props[i](e);
			}
		}
	};

	updatePlaceholder() {
		clearTimeout(this.updatePlaceholderTimer);
		this.updatePlaceholderTimer = setTimeout(this.updatePlaceholderSync, 100);
	}

	updatePlaceholderSync = () => {
		if (!this.base) {
			return;
		}

		if (!this.base.textContent && !HIDE_PLACEHOLDER_REGEX.test(this.base.innerHTML)) {
			this.base.setAttribute('data-empty', '');
		} else if (this.base.hasAttribute('data-empty')) {
			this.base.removeAttribute('data-empty');
		}
	};

	handlePaste = e => {
		if (this.props.onPaste) this.props.onPaste(e);
		this.scheduleCleanup();
	};

	scheduleCleanup() {
		if (this.cleanupTimer != null) return;
		this.cleanupTimer = setTimeout(this.cleanupSync);
	}

	cleanupSync = () => {
		if (!this.base) {
			return;
		}
		// Insert an element at the cursor so we can find it after sanitizing.
		let selection = window.getSelection();
		let range = selection.rangeCount && selection.getRangeAt(0);
		let sentinel = document.createElement('span');
		sentinel.setAttribute('data-contains-cursor', 'true');
		if (range) range.insertNode(sentinel);

		clearTimeout(this.cleanupTimer);
		this.cleanupTimer = null;

		// Copy children into a <body> element for sanitization
		const body = document.createElement('body');
		// insert a dummy text node so DOMPurify doesn't remove the first real element
		const dummy = document.createTextNode('');
		body.appendChild(dummy);

		moveChildren(this.base, body);

		const doc = doSanitize(body, [], true);

		const lastChild = doc.body.lastChild;

		moveChildren(doc.body, this.base, dummy);

		// Restore the selection by traversing its path in the new DOM:
		this.base.focus();
		selection = window.getSelection();
		selection.removeAllRanges();
		range = document.createRange();
		let removeSentinel = true;

		// if the sentinel got replaced during sanitization, find its replacement:
		if (sentinel == null || !this.base.contains(sentinel)) {
			sentinel = this.base.querySelector('[data-contains-cursor]');
		}

		if (sentinel == null) {
			removeSentinel = false;
			sentinel = this.base.lastChild || lastChild;
		}

		if (sentinel != null) {
			range.setStartAfter(sentinel);
			range.collapse(true);
			selection.addRange(range);
			if (removeSentinel) sentinel.parentNode.removeChild(sentinel);
		}
	};

	getDocument() {
		const { base } = this;
		if (base.body == null) {
			base.body = base;
			base.getElementById = id => base.querySelector('#' + id);
		}
		return base;
	}

	getResolvedValue = ({ value, stylesheet }) => {
		let html = value == null ? '' : String(value);

		if (!html.match(/<html>/)) {
			html = `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
		}
		if (stylesheet) {
			// Try to inject the stylesheet at the end of the docment head. If there isn't one, append it:
			if (html === (html = html.replace('</head>', `</head><style>${stylesheet}</style>`))) {
				html += `<style>${stylesheet}</style>`;
			}
		}

		return new Promise(resolve => {
			if (html.length === 0) {
				resolve('');
			}

			// Allow dom to get created first then we will sanitize content and append it to dom
			// otherwise this gives script execution forbidden error in electron
			setTimeout(() => {
				if (!this.base) {
					return;
				}
				resolve(sanitize(html));
			}, 0);
		});
	};

	setContent = html => {
		if (!this.base) {
			return;
		}

		this.base.innerHTML = this.eventValue = html;
	};

	componentWillMount() {
		if (this.props.value || this.props.stylesheet) {
			this.getResolvedValue(this.props).then(content => {
				this.setContent(content);
			});
		}

		document.addEventListener('selectionchange', this.handleSelectionChange);
	}

	shouldComponentUpdate(nextProps) {
		if (nextProps.value !== this.props.value || nextProps.stylesheet !== this.props.stylesheet) {
			if (nextProps.value !== this.eventValue) {
				this.getResolvedValue(nextProps).then(content => {
					this.setContent(content);
				});
				this.updatePlaceholder();
			}
		}
		return false;
	}

	componentWillUnmount() {
		document.removeEventListener('selectionchange', this.handleSelectionChange);
	}

	render({ children, value, stylesheet, ...props }) {
		const resetId = ensureCssReset();

		return (
			<rich-text-area
				{...props}
				contentEditable
				data-css-reset={resetId}
				onFocusIn={this.handleFocusIn}
				onInput={this.handleEvent}
				onKeyDown={this.handleEvent}
				onKeyUp={this.handleEvent}
				onChange={this.handleEvent}
				onPaste={this.handlePaste}
			/>
		);
	}
}
