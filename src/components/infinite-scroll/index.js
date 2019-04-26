import { h, Component } from 'preact';
import { Spinner } from '@zimbra/blocks';
import cx from 'classnames';
import style from './style';
import linkref from 'linkref';
import VirtualList from 'preact-virtual-list';

const SCROLL_BUFFER = 100;

export default class InfiniteScroll extends Component {
	state = {
		lastScrollPosition: 0
	};

	getScrollElement = () => this.refs.list.base;

	hasScrollbar = () => isOverflowedY(this.getScrollElement());
	hasVisibility = () => hasVisibility(this.getScrollElement());

	handleScroll = () => {
		if (this.props.hasMore && !this.props.isFetchingData) {
			const scrollElement = this.getScrollElement();
			const offset = scrollElement.scrollTop,
				max = scrollElement.scrollHeight - scrollElement.offsetHeight;

			if (max - offset < SCROLL_BUFFER) {
				this.props.loadMore();
			}
		}
		this.refs.list.handleScroll();
	};

	loadMoreUntilScrollable = ({ hasMore, isFetchingData, loadMore } = this.props) => {
		// If you change off of this tab while it is in a "load more" loop, it will cease looping and become unscollable upon reactivation.
		if (this.hasVisibility() && !this.hasScrollbar() && hasMore && !isFetchingData && loadMore) {
			loadMore();
		}
	};

	componentDidMount() {
		if (this.hasVisibility() && !this.hasScrollbar()) {
			this.loadMoreUntilScrollable(this.props);
		}
	}

	componentWillReceiveProps(nextProps) {
		if (this.hasVisibility() && !this.hasScrollbar()) {
			this.loadMoreUntilScrollable(nextProps);
		}
	}

	render({ data, rowHeight, renderRow, isFetchingData, hasMore, ...props }) {
		return (
			<div class={props.class}>
				<VirtualList
					{...props}
					onScroll={this.handleScroll}
					ref={linkref(this, 'list')}
					class={cx(style.virtualList, isFetchingData && style.isLoading)}
					data={data}
					rowHeight={rowHeight}
					renderRow={renderRow}
				/>
				{isFetchingData && (
					<div class={style.loading}>
						<Spinner class={style.spinner} />
					</div>
				)}
			</div>
		);
	}
}

function isOverflowedY(element) {
	// source: http://stackoverflow.com/questions/9333379/javascript-css-check-if-overflow
	return element.scrollHeight > element.clientHeight;
}

function hasVisibility(element) {
	return element.offsetHeight > 0;
}
