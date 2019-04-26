import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import { sanitize, ensureCssReset } from '../../lib/html-viewer';
import quoteToggle from '../../lib/quote-toggle';
import cx from 'classnames';
import linkref from 'linkref';
import style from './style';

const PROCESSORS = [quoteToggle];

export default class HtmlViewer extends PureComponent {
	handleResize = () => {
		if (this.resizeTimer) return;
		this.resizeTimer = setTimeout(this.resize, 200);
	};

	resize = () => {
		clearTimeout(this.resizeTimer);
		this.resizeTimer = null;

		const scale = String(this.props.scale) === 'true',
			width = this.refs.wrap.scrollWidth,
			innerWidth = this.base.offsetWidth;

		this.setState({
			scalingRatio: scale ? Math.min(1, innerWidth / width) : 1
		});
	};

	componentDidMount() {
		addEventListener('resize', this.handleResize);
	}

	componentDidUpdate({ html }) {
		if (html !== this.props.html) {
			this.resize();
		}
	}

	componentWillUnmount() {
		removeEventListener('resize', this.handleResize);
	}

	render({ html, scale, fit, disableProcessors, localFolder, ...props }, { scalingRatio = 1 }) {
		const resetId = ensureCssReset();
		const sanitized = disableProcessors
			? sanitize(html, null, localFolder)
			: sanitize(html, PROCESSORS, localFolder);

		return (
			<div data-css-reset={resetId} {...props} class={cx(props.class, style.htmlViewer)}>
				<div
					class={style.inner}
					ref={linkref(this, 'wrap')}
					dangerouslySetInnerHTML={{ __html: sanitized }} // eslint-disable-line react/no-danger
					style={{ transform: `scale(${scalingRatio})` }}
				/>
			</div>
		);
	}
}
