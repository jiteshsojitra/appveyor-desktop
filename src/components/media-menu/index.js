import { h, Component } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import { KeyCodes, Tabs, Tab, Icon } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import { configure } from '../../config';
import get from 'lodash-es/get';
import { selectTab as selectTabAction, hide, embed, attach } from '../../store/media-menu/actions';
import style from './style';
import cx from 'classnames';
import {
	PhotosNavItem,
	PhotosContent,
	FilesNavItem,
	FilesContent,
	GifsNavItem,
	GifsContent
} from './tabs';
import Toolbar from './components/toolbar';
import withMediaQuery from '../../enhancers/with-media-query';
import { screenSmMax, minWidth } from '../../constants/breakpoints';

@connect(({ mediaMenu }) => ({ open: mediaMenu.visible }))
@withMediaQuery(minWidth(screenSmMax), 'matchesScreenMd')
export class MediaMenuButton extends Component {
	render({ open, isOffline, ...props }) {
		return (
			<Localizer>
				<button
					{...props}
					title={<Text id={`mediaMenu.toggleButton.${open ? 'close' : 'open'}`} />}
					class={cx(style.icon, open && style.active, props.class, isOffline && style.disabled)}
					disabled={isOffline}
				>
					<Icon size="lg" name={`multimedia${open ? '-active' : ''}`} />
				</button>
			</Localizer>
		);
	}
}

const TAB_SEARCH_CATEGORIES = ['photos', 'files', 'gifs', 'web'];

@connect(
	null,
	{
		onEmbedFiles: embed,
		onEmbedLinks: embed,
		onAttachFiles: attach,
		onChangeActiveTab: selectTabAction,
		onHideMediaMenu: hide
	}
)
export default class MediaMenu extends Component {
	state = {
		value: '',
		searchCategory: TAB_SEARCH_CATEGORIES[0],
		searchTerm: ''
	};

	clearInput = () => {
		this.setState({ searchTerm: '', value: '' });
	};

	handleChangeActiveTab = index => {
		this.setState({ searchCategory: TAB_SEARCH_CATEGORIES[index] });
		this.props.onChangeActiveTab(index);
	};

	handleSearch = e => {
		const searchTerm = typeof e === 'string' ? e : e.target.value;
		this.setState({ searchTerm, value: searchTerm });
	};

	handleInput = e => {
		const { value } = e.target;
		this.setState({ value });
		if (value.length === 0) {
			this.setState({ searchTerm: '' });
		}
	};

	handleAction = actionCallback => (...args) => {
		actionCallback(...args);
		if (!this.props.matchesScreenMd) {
			this.props.onHideMediaMenu();
		}
	};

	render(
		{ onAttachFiles, onEmbedLinks, onEmbedFiles, onHideMediaMenu, ...props },
		{ searchTerm, searchCategory, value }
	) {
		return (
			<div {...props} class={cx(style.wrapper, props.class)}>
				<Toolbar onClose={onHideMediaMenu} />
				<Localizer>
					<MediaMenuSearch
						value={value}
						placeholder={<Text id={`search.categories.${searchCategory}`} />}
						onClearInput={this.clearInput}
						onSearch={this.handleSearch}
						onInput={this.handleInput}
					/>
				</Localizer>
				<MediaMenuControls
					onEmbedFiles={this.handleAction(onEmbedFiles)}
					onAttachFiles={this.handleAction(onAttachFiles)}
					onEmbedLinks={this.handleAction(onEmbedLinks)}
					onChangeActive={this.handleChangeActiveTab}
					searchTerm={searchTerm}
					onSearch={this.handleSearch}
				/>
			</div>
		);
	}
}

class MediaMenuSearch extends Component {
	handleKeyDown = e => {
		const { onSearch } = this.props;
		if (e.keyCode === KeyCodes.CARRIAGE_RETURN && typeof onSearch === 'function') {
			onSearch(e);
		}
	};

	render({ onClearInput, ...props }) {
		delete props.onSearch;
		return (
			<span class={style.search}>
				<input type="text" {...props} onKeyDown={this.handleKeyDown} />
				{props.value && (
					<Localizer>
						<button aria-label={<Text id="mediaMenu.buttons.clearSearch" />} onClick={onClearInput}>
							<Icon name="close" />
						</button>
					</Localizer>
				)}
			</span>
		);
	}
}

function MediaMenuTab(props) {
	return <Tab {...props} class={cx(style.tab, props.class)} />;
}

@connect(state => ({ selectedTabIndex: get(state, 'mediaMenu.selectedTab') }))
@configure('giphyKey')
class MediaMenuControls extends Component {
	render({
		searchTerm,
		selectTab,
		onSearch,
		onEmbedFiles,
		onAttachFiles,
		onEmbedLinks,
		selectedTabIndex,
		giphyKey,
		...props
	}) {
		return (
			<Tabs
				{...props}
				active={selectedTabIndex}
				tabActiveClass={cx(style.activeTab, props.tabActiveClass)}
				class={cx(style.tabs, props.class)}
			>
				{
					<MediaMenuTab title={<PhotosNavItem class={style.navItem} />}>
						<PhotosContent
							class={style.content}
							searchTerm={searchTerm}
							onEmbedFiles={onEmbedFiles}
							onAttachFiles={onAttachFiles}
						/>
					</MediaMenuTab>
				}
				{
					<MediaMenuTab title={<FilesNavItem class={style.navItem} />}>
						<FilesContent
							class={style.content}
							searchTerm={searchTerm}
							onEmbedFiles={onEmbedFiles}
							onAttachFiles={onAttachFiles}
						/>
					</MediaMenuTab>
				}

				{giphyKey && (
					<MediaMenuTab title={<GifsNavItem class={style.navItem} />}>
						<GifsContent
							class={style.content}
							tags={searchTerm}
							onSearch={onSearch}
							onEmbedFiles={onEmbedFiles}
						/>
					</MediaMenuTab>
				)}
			</Tabs>
		);
	}
}
