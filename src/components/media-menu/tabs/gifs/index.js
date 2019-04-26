import { h, Component } from 'preact';
import { Icon, Spinner, Tooltip } from '@zimbra/blocks';
import { Text, Localizer, withText } from 'preact-i18n';
import ScrollDiv from '../../components/scroll-div';
import ThumbnailPanel from '../../components/thumbnail-panel';
import { SuggestionGroup } from '../../components/suggested-search';
import Thumbnail from '../../../thumbnail';
import InfiniteScroll from '../../../infinite-scroll';
import compatWrapper from '../../../compat-wrapper';
import style from './style';
import { defaultProps, withProps } from 'recompose';
import cx from 'classnames';
import wire from 'wiretie';
import { GIPHY_LOGO_URL } from '../../../../constants/plus-sign-menu';
import { THUMBS_PER_ROW, DEFAULT_TAGS, DEFAULT_SUGGESTED_TAGS } from './constants';

export function NavItem(props) {
	return <Icon name="GIF" {...props} />;
}

@defaultProps({
	tags: '',
	thumbsPerRow: THUMBS_PER_ROW,
	defaultTags: DEFAULT_TAGS,
	suggestedTags: DEFAULT_SUGGESTED_TAGS
})
@withProps(({ thumbsPerRow }) => ({
	numSuggestedThumbnails: 2 * thumbsPerRow,
	gifsPerPage: 6 * thumbsPerRow
}))
@compatWrapper
@wire(
	'gifs',
	({ tags, defaultTags, gifsPerPage, numSuggestedThumbnails }) => ({
		gifs: [
			'getGifsByTag',
			{ q: tags || defaultTags, limit: tags ? gifsPerPage : numSuggestedThumbnails }
		]
	}),
	gifs => ({
		getGifsByTag: gifs.getGifsByTag
	})
)
export class Content extends Component {
	state = {
		previewHref: null,
		gifResults: [],
		gifs: [],
		page: 0,
		hasMore: true
	};

	counter = 0;

	handlePreview = previewHref => {
		this.setState({ previewHref });
		if (typeof this.props.onHover === 'function') {
			this.props.onHover(previewHref);
		}
	};

	loadMore = () => {
		const { getGifsByTag, gifsPerPage, defaultTags, tags } = this.props,
			page = this.state.page + 1,
			offset = page * gifsPerPage,
			id = ++this.counter;

		this.setState({ loading: true });

		getGifsByTag({
			q: tags || defaultTags,
			offset,
			limit: gifsPerPage
		})
			.then(results => {
				// ignore outdated responses:
				if (this.counter !== id || !results) return;

				this.setState({
					page,
					loading: false,
					hasMore: results.pagination && results.pagination.total_count >= offset,
					gifs: this.state.gifs.concat(results.data)
				});
			})
			.catch(err => {
				console.error('Oops, no more gifs!', err);
				return Promise.reject(err);
			}); // eslint-disable-line no-console
	};

	componentWillReceiveProps(nextProps) {
		if (nextProps.tags !== this.props.tags) {
			// invalidate any pending requests:
			this.counter++;

			this.setState({
				loading: false,
				page: 0,
				gifs: [],
				hasMore: true
			});
		}
	}

	renderGroup = group =>
		group.map(gif => (
			<GiphyGif onHover={this.handlePreview} onEmbed={this.props.onEmbedFiles} gif={gif} />
		));

	render(allProps, { loading, previewHref, gifs = [], hasMore }) {
		let {
			tags,
			gifs: defaultGifs,
			numSuggestedThumbnails,
			thumbsPerRow,
			suggestedTags,
			onSearch,
			pending,
			rejected,
			...props
		} = allProps;

		const isDefault = !tags.length;

		defaultGifs = (defaultGifs && defaultGifs.data) || [];

		gifs = isDefault ? defaultGifs.slice(0, numSuggestedThumbnails) : defaultGifs.concat(gifs);

		// Bucket into rows:
		if (gifs) {
			const groups = [];
			for (let i = 0; i < gifs.length; i += thumbsPerRow) {
				groups.push(gifs.slice(i, i + thumbsPerRow));
			}
			gifs = groups;
		}

		return (
			<div class={cx(style.gifs, props.class)}>
				<header>
					<h4>
						<Text id={`mediaMenu.gifs.heading.${tags.length ? 'not' : ''}empty`} />
					</h4>
					<Localizer>
						<img src={GIPHY_LOGO_URL} alt={<Text id="mediaMenu.gifs.poweredBy" />} />
					</Localizer>
				</header>
				<Tooltip class={!previewHref && style.hidden} position="left">
					<Localizer>
						<img alt={<Text id="mediaMenu.gifs.fromGiphy" />} src={previewHref} />
					</Localizer>
				</Tooltip>

				<ScrollDiv>
					<ThumbnailPanel class={cx(isDefault && style.hasSuggestionGroup)}>
						{isDefault ? (
							gifs.map(this.renderGroup)
						) : pending ? (
							<Spinner block />
						) : rejected ? (
							<div class={style.error}>
								<Text id="error.any" fields={{ e: String(rejected.gifs) }} />
							</div>
						) : gifs && gifs.length > 0 ? (
							<InfiniteScroll
								data={gifs}
								isFetchingData={loading}
								hasMore={hasMore}
								rowHeight={85}
								renderRow={this.renderGroup}
								loadMore={this.loadMore}
							/>
						) : (
							<div class={style.noResults}>
								<Text id="mediaMenu.gifs.empty" />
							</div>
						)}
					</ThumbnailPanel>

					{isDefault && [
						<h4>
							<Text id="mediaMenu.gifs.subheading" />
						</h4>,
						<SuggestionGroup onClick={onSearch} tags={suggestedTags} />
					]}
				</ScrollDiv>
			</div>
		);
	}
}

@withText({
	name: 'mediaMenu.gifs.fromGiphy'
})
class GiphyGif extends Component {
	handleEmbed = () => {
		const {
			onEmbed,
			name,
			gif: { images }
		} = this.props;
		if (typeof onEmbed === 'function') {
			onEmbed([
				{
					contentType: 'image/gif',
					name,
					url: images.original.url
				}
			]);
		}
	};

	handleHover = args => {
		const { onHover, gif } = this.props;
		if (typeof onHover === 'function') {
			onHover(!args ? args : gif.images.original.url);
		}
	};

	render({ name, onEmbed, onHover, gif, ...props }) {
		const { images } = gif;
		const { url: thumbnail } = images.original_still;
		const { url } = images.original;

		return (
			<Thumbnail
				{...props}
				class={style.thumbnail}
				thumbnail={thumbnail}
				data={{ url, name, contentType: 'image/gif' }}
				src={url}
				scrimProps={{ title: name }}
				onClick={this.handleEmbed}
				onHover={this.handleHover}
			/>
		);
	}
}
