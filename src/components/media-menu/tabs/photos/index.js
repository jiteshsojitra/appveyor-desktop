import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { Icon, Spinner, Tooltip } from '@zimbra/blocks';
import ScrollDiv from '../../components/scroll-div';
import ThumbnailPanel from '../../components/thumbnail-panel';
import Thumbnail from '../../../thumbnail';
import InfiniteScroll from '../../../infinite-scroll';
import style from './style';
import cx from 'classnames';
import wire from 'wiretie';

export function NavItem(props) {
	return <Icon name="image" {...props} />;
}

const PER_PAGE = 24;
const THUMBS_PER_ROW = 4;

@wire('zimbra', null, ({ attachments }) => ({
	getAttachmentImages: attachments.images
}))
export class Content extends Component {
	handlePreview = previewHref => {
		this.setState({ previewHref });
		if (typeof this.props.onHover === 'function') {
			this.props.onHover(previewHref);
		}
	};

	state = {
		previewHref: null,
		page: -1,
		attachments: [],
		isLoading: true,
		isFetchingData: false,
		rejected: {},
		hasMore: true
	};

	counter = 0;

	loadMore = (searchTerm = this.props.searchTerm) => {
		const { getAttachmentImages } = this.props,
			page = this.state.page + 1,
			id = ++this.counter;

		this.setState({ isFetchingData: true });

		getAttachmentImages({
			searchTerm,
			offset: page * PER_PAGE,
			limit: PER_PAGE,
			larger: '10KB'
		})
			.then(results => {
				// ignore outdated responses:
				if (this.counter !== id) return;

				this.setState({
					page,
					isFetchingData: false,
					isLoading: false,
					rejected: {},
					hasMore: results.more,
					attachments: this.state.attachments.concat(results.attachments)
				});
			})
			.catch(e => {
				if (this.counter !== id) return;

				this.setState({
					isFetchingData: false,
					isLoading: false,
					rejected: { ...this.state.rejected, attachments: String(e) },
					hasMore: false
				});
			});
	};

	componentDidMount() {
		this.counter++;
		this.loadMore();
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.searchTerm !== this.props.searchTerm) {
			this.counter++;
			this.setState({
				page: -1,
				attachments: [],
				isFetchingData: false,
				isLoading: true,
				rejected: {},
				hasMore: true
			});
			this.loadMore(nextProps.searchTerm);
		}
	}
	renderPhotos = group => (
		<div>
			{group.map(attachment => (
				<PhotoThumbnail
					onHover={this.handlePreview}
					onEmbedFiles={this.props.onEmbedFiles}
					attachment={attachment}
				/>
			))}
		</div>
	);
	render(
		{ searchTerm, ...props },
		{ previewHref, attachments, hasMore, isFetchingData, isLoading, rejected }
	) {
		const loading = isLoading && <Spinner block />;
		const err = rejected.attachments && (
			<div>
				<Text id="error.any" fields={{ e: rejected.attachments }} />
			</div>
		);
		const attachmentGroups = [];

		// Bucket into size-width groups (for rows):
		if (attachments) {
			attachments = attachments.filter(({ size }) => size > 10000); // Do not render images below 10KB
			for (let i = 0; i < attachments.length; i += THUMBS_PER_ROW) {
				attachmentGroups.push(attachments.slice(i, i + THUMBS_PER_ROW));
			}
		}

		const content = ((typeof attachments !== 'undefined' && attachments.length > 0) || hasMore) && (
			<ThumbnailPanel>
				<InfiniteScroll
					isFetchingData={isFetchingData}
					hasMore={hasMore}
					data={attachmentGroups}
					rowHeight={87}
					renderRow={this.renderPhotos}
					loadMore={this.loadMore}
				/>
			</ThumbnailPanel>
		);

		const empty = !searchTerm ? (
			<p>
				<Text id="mediaMenu.photos.placeholder" />
			</p>
		) : (
			<NoResults searchTerm={searchTerm} />
		);

		return (
			<div {...props} class={cx(style.files, props.class)}>
				<h4>
					<Text id="mediaMenu.photos.fromEmail" />
				</h4>
				{previewHref && (
					<Tooltip position="left">
						<img alt={`Image ${previewHref}`} src={previewHref} />
					</Tooltip>
				)}
				<ScrollDiv>{loading || err || content || empty}</ScrollDiv>
			</div>
		);
	}
}

class PhotoThumbnail extends Component {
	handleEmbed = () => {
		const { onEmbedFiles, attachment } = this.props;
		if (typeof onEmbedFiles !== 'undefined') {
			onEmbedFiles([attachment]);
		}
	};

	render({ onEmbedFiles, attachment, ...props }) {
		const { url, filename, contentId } = attachment;
		const title = filename || contentId;
		return (
			<Thumbnail
				{...props}
				onClick={this.handleEmbed}
				data={attachment}
				src={url}
				scrimProps={{ title }}
				alt={`Attachment ${title}`}
			/>
		);
	}
}

function NoResults({ searchTerm }) {
	return (
		<div>
			<Text id="mediaMenu.photos.noResults" fields={{ searchTerm }} />
			<ul class={style.noResults}>
				<li>
					<Text id="mediaMenu.photos.noResultsKeywords" />
				</li>
				<li>
					<Text id="mediaMenu.photos.noResultsName" />
				</li>
			</ul>
		</div>
	);
}
