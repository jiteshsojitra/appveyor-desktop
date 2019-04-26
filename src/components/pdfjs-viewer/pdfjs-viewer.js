import { h, Component } from 'preact';
import linkref from 'linkref';
import pdfjs from 'pdfjs-dist';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import { memoize, debounce as throttle } from 'decko';
import { defaultProps, withProps } from 'recompose';
import get from 'lodash/get';
import cx from 'classnames';
import style from './style';
import workerSrc from '!!file-loader!pdfjs-dist/build/pdf.worker.js';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const getPDFJSDocument = memoize(src => pdfjs.getDocument({ url: src, withCredentials: true }));

@defaultProps({ scale: 1, overscan: 2 })
@withProps(({ scale, overscan }) => ({
	overscan: scale < 1 ? overscan * 2 : overscan // Double overscan when zoomed out
}))
export default class PdfjsViewer extends Component {
	static initialState = {
		numPages: 0,
		currentPage: 0,
		pageViewportMap: undefined
	};

	state = { ...PdfjsViewer.initialState };

	uid = 0;

	_renderedPages = {};

	reset = () => {
		this._renderedPages = {};
		if (this.state.numPages !== 0) {
			this.setState({ ...PdfjsViewer.initialState });
		}
	};

	getScaledViewport = (src, scale, pageIndex) =>
		getPDFJSDocument(src)
			.then(pdfDoc => pdfDoc.getPage(+pageIndex))
			.then(pdfPage => {
				const canvas = this.refs && this.refs['canvas_' + pageIndex];
				if (!canvas) {
					return Promise.reject(`canvas ${pageIndex} does not exist`);
				}
				const fullScaleViewport = pdfPage.getViewport(1.0);
				return pdfPage.getViewport(
					(canvas.parentNode.clientWidth / fullScaleViewport.width).toFixed(2) * 0.9 * scale
				);
			});

	getDocumentPagesViewports = (src, scale) =>
		getPDFJSDocument(src).then(pdfDoc => {
			let pageIndex;
			const queue = [];

			for (pageIndex = 1; pageIndex <= pdfDoc.numPages; ++pageIndex) {
				queue.push(this.getScaledViewport(src, scale, pageIndex));
			}

			return Promise.all(queue).then(scaledViewports =>
				scaledViewports.reduce(
					(acc, scaledViewport, index) => ({
						...acc,
						[index + 1]: scaledViewport
					}),
					{}
				)
			);
		});

	handleLoadDocument = ({ src, scale, ...props }) => {
		const uid = ++this.uid;

		getPDFJSDocument(src).then(pdfDoc => {
			if (this.uid !== uid) {
				return;
			}

			this.setState({ numPages: pdfDoc.numPages });

			this.handleScaleDocument({ src, scale, ...props });
			this.setCurrentPage(1);
			props.onLoadDocument && props.onLoadDocument(pdfDoc);
		});
	};

	/**
	 * Rescale canvas elements without redrawing them. This leaves them blurry
	 * but they will be re-drawn when scrolled back into view.
	 * TODO: Consider making this queueable - multiple rapid rescales can cause large jumps in currentPage
	 */
	handleScaleDocument = ({ src, scale, overscan, ...props }) => {
		this._renderedPages = {};

		this.getDocumentPagesViewports(src, scale).then(pageViewportMap => {
			this.setState({ pageViewportMap });

			if (this.state.currentPage) {
				this.renderPageRange({
					start: this.state.currentPage - overscan,
					end: this.state.currentPage + overscan,
					src,
					scale,
					...props
				});
				setTimeout(() => scrollIntoViewIfNeeded(this.refs[`canvas_${this.state.currentPage}`]));
			}
		});
	};

	// Pages begin at 1; not 0
	setCurrentPage = pageIndex => {
		const { overscan } = this.props;

		console.log(`Reading page ${pageIndex} of ${this.state.numPages}`); // eslint-disable-line no-console

		this.renderPageRange({ start: pageIndex - overscan, end: pageIndex + overscan, ...this.props });
		this.setState({ currentPage: pageIndex });
		this.props.onChangePage && this.props.onChangePage(pageIndex);
	};

	/**
	 * Calculate the current page based on the element at the center of the
	 * scroll container
	 */
	handleScrollContainer = throttle(({ target }) => {
		const { left, top, width, height } = (target && target.getBoundingClientRect()) || {};
		const elementAtCentroid = document.elementFromPoint(left + width / 2, top + height / 2);

		if (!elementAtCentroid || elementAtCentroid.tagName !== 'CANVAS') {
			return;
		}

		const currentPage =
			Array.prototype.indexOf.call(elementAtCentroid.parentNode.childNodes, elementAtCentroid) + 1;
		currentPage && this.setCurrentPage(currentPage);
	}, 50);

	handleClickCanvas = ({ target }) => {
		const currentPage = Array.prototype.indexOf.call(target.parentNode.childNodes, target) + 1;
		const { container } = this.props;

		if (currentPage && container) {
			// Snap the clicked page into the center of `container`.
			container.scrollTop = target.offsetTop + target.offsetHeight / 2 - container.clientHeight / 2;

			this._renderedPages[currentPage] = undefined;
			this.setCurrentPage(currentPage);
		}
	};

	componentDidMount() {
		if (this.props.container) {
			this.props.container.addEventListener('scroll', this.handleScrollContainer, {
				passive: true
			});
		}
		this.handleLoadDocument(this.props);
	}

	componentWillReceiveProps({ src, scale, container, ...nextProps }) {
		if (this.props.src !== src) {
			this.reset();
			this.handleLoadDocument({ src, scale, ...nextProps });
		} else if (this.props.scale !== scale) {
			this.handleScaleDocument({ src, scale, ...nextProps });
		}

		if (this.props.container !== container) {
			this.props.container &&
				this.props.container.removeEventListener('scroll', this.handleScrollContainer, {
					passive: true
				});
			container &&
				container.addEventListener('scroll', this.handleScrollContainer, { passive: true });
		}
		// TODO: Maybe allow `currentPage` to be overridden to allow the user to jump pages.
	}

	componentWillUnmount() {
		if (this.props.container) {
			this.props.container.removeEventListener('scroll', this.handleScrollContainer, {
				passive: true
			});
		}
	}

	renderPage = ({ pageIndex, src, scale, onLoadPage }) =>
		this._renderedPages[pageIndex] ||
		(this._renderedPages[pageIndex] = getPDFJSDocument(src)
			.then(pdfDoc => pdfDoc.getPage(+pageIndex))
			.then(pdfPage => {
				const canvas = this.refs && this.refs['canvas_' + pageIndex];

				if (!canvas) {
					return Promise.reject('canvas does not exist');
				}

				return this.getScaledViewport(src, scale, pageIndex).then(
					scaledViewport =>
						pdfPage.render({
							canvasContext: canvas.getContext('2d'),
							viewport: scaledViewport
						}).promise
				);
			})
			.then(() => {
				onLoadPage && onLoadPage(pageIndex);
			}));

	renderPageRange = ({ start, end, ...rest }) => {
		for (
			let pageIndex = Math.max(1, start);
			pageIndex <= Math.min(this.state.numPages, end);
			++pageIndex
		) {
			this.renderPage({ pageIndex, ...rest });
		}
	};

	render({ src, scale, overscan, onLoad, container, ...props }, { numPages, pageViewportMap }) {
		return (
			<div class={cx(style.container, props.class)}>
				{Array(...Array(numPages)).reduce(
					(acc, _, index) => [
						...acc,
						<canvas
							{...props}
							onClick={this.handleClickCanvas}
							width={get(pageViewportMap, `${index + 1}.width`)}
							height={get(pageViewportMap, `${index + 1}.height`)}
							ref={linkref(this, 'canvas_' + (index + 1))}
						/>
					],
					[]
				)}
			</div>
		);
	}
}
