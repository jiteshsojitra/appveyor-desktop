import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { Icon, Spinner } from '@zimbra/blocks';
import DraggableCard from '../../../draggable-card';
import ScrollDiv from '../../components/scroll-div';
import style from './style';
import cx from 'classnames';
import wire from 'wiretie';
import InfiniteScroll from '../../../infinite-scroll';
import AttachmentBadge from '../../../attachment-badge';
import SentTimeFormat from '../../../sent-time-format';

export function NavItem(props) {
	return <Icon name="paperclip" {...props} />;
}
const PER_PAGE = 10;
@wire('zimbra', null, ({ attachments }) => ({
	getAttachments: attachments.files
}))
export class Content extends Component {
	state = {
		page: -1,
		attachments: [],
		isLoading: true,
		isFetchingData: false,
		hasMore: true
	};
	counter = 0;
	loadMore = (searchTerm = this.props.searchTerm) => {
		const { getAttachments } = this.props,
			page = this.state.page + 1,
			id = ++this.counter;

		this.setState({ isFetchingData: true });

		getAttachments({
			searchTerm,
			offset: page * PER_PAGE,
			limit: PER_PAGE
		}).then(results => {
			// ignore outdated responses:
			if (this.counter !== id) return;

			this.setState({
				page,
				isFetchingData: false,
				isLoading: false,
				hasMore: results.more,
				attachments: this.state.attachments.concat(results.attachments)
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
				isLoading: true,
				isFetchingData: false,
				hasMore: true
			});
			this.loadMore(nextProps.searchTerm);
		}
	}

	renderAttachments = attachment => (
		<AttachmentCard onAttachFiles={this.props.onAttachFiles} attachment={attachment} />
	);

	render(
		{ searchTerm, onEmbedFiles, onAttachFiles, rejected = {}, ...props },
		{ isFetchingData, isLoading, hasMore, attachments }
	) {
		const loading = isLoading && <Spinner block />;
		const err = rejected.attachments && (
			<div>
				<Text id="error.any" fields={{ e: rejected.attachments }} />
			</div>
		);

		const content = ((typeof attachments !== 'undefined' && attachments.length > 0) || hasMore) && (
			<InfiniteScroll
				data={attachments}
				rowHeight={97}
				isFetchingData={isFetchingData}
				hasMore={hasMore}
				renderRow={this.renderAttachments}
				loadMore={this.loadMore}
			/>
		);

		const empty = !searchTerm ? (
			<p>
				<Text id="mediaMenu.files.placeholder" />
			</p>
		) : (
			<NoResults searchTerm={searchTerm} />
		);

		return (
			<div {...props}>
				<h4>
					<Text id="mediaMenu.files.fromEmail" />
				</h4>
				<ScrollDiv>{loading || err || content || empty}</ScrollDiv>
			</div>
		);
	}
}

function ExpandButtonIcon(props) {
	return (
		<button {...props} class={cx(style.expandButton, props.class)}>
			<Icon name="external-link" />
		</button>
	);
}

class AttachmentCard extends Component {
	handleAttachFiles = () => {
		const { attachment, onAttachFiles } = this.props;
		if (typeof onAttachFiles === 'function') {
			onAttachFiles([attachment]);
		}
	};

	handleExpand = e => {
		console.log('You tried to expand:', this.props.attachment); // eslint-disable-line no-console
		e.stopPropagation();
	};

	render({ attachment, onAttachFiles, ...props }) {
		const { sentDate, filename, from: sender } = attachment;
		const senderName = sender && sender[0] && (sender[0].name || sender[0].address);

		return (
			<DraggableCard
				{...props}
				square={false}
				data={attachment}
				title={filename}
				scrim={<ExpandButtonIcon onClick={this.handleExpand} />}
				class={cx(style.attachmentCard, props.class)}
				onClick={this.handleAttachFiles}
			>
				<AttachmentBadge attachment={attachment} class={style.left} />
				<div class={style.right}>
					<div class={style.filename}>{filename}</div>
					{senderName && <div class={style.sender}>{senderName}</div>}
					{sentDate && (
						<div class={style.sentTime}>
							<SentTimeFormat date={sentDate} />
						</div>
					)}
				</div>
			</DraggableCard>
		);
	}
}

function NoResults({ searchTerm }) {
	return (
		<div>
			<Text id="mediaMenu.files.noResults" fields={{ searchTerm }} />
			<ul class={style.noResults}>
				<li>
					<Text id="mediaMenu.files.noResultsKeywords" />
				</li>
				<li>
					<Text id="mediaMenu.files.noResultsName" />
				</li>
			</ul>
		</div>
	);
}
