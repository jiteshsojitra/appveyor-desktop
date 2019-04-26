import { h, Component } from 'preact';
import { Popover, Tabs, Tab, Icon } from '@zimbra/blocks';
import { Text, Localizer } from 'preact-i18n';
import VirtualList from 'preact-virtual-list';
import cx from 'classnames';
import style from '../style';
import emojiTabs from './emoji-tabs.json';
import emojione from 'emojione';
import emojiGroups from './emoji-groups';

emojione.ascii = true; //enable conversion of ascii smileys

export class EmojiMenu extends Component {
	state = {
		active: false
	};

	addEmoji = emoji => {
		this.props.onEmojiSelect({
			emoji: {
				url: generateEmojiUrl(emoji.unicode),
				name: emojione.shortnameToUnicode(emoji.shortname)
			}
		});
		this.setState({ active: false });
	};

	close = () => {
		this.setState({ active: false });
	};

	handleToggle = value => {
		this.setState({ active: value });
	};

	renderEmojiRow = emojiRow => (
		<div class={style.emojiRow}>
			{emojiRow.map(emoji => (
				<Emoji emoji={emoji} onClick={this.addEmoji} />
			))}
		</div>
	);

	render(props, { active }) {
		return (
			<Localizer>
				<Popover
					active={active}
					class={style.submenuWrapper}
					toggleClass={cx(style.toggle, style.toolbarButton)}
					popoverClass={style.emojiMenu}
					text={<Icon name="smile-o" />}
					tooltip={<Text id={`compose.toolbar.emojiMenu`} />}
					onClickOutside={this.close}
					onToggle={this.handleToggle}
				>
					<Tabs class={style.tabs} tabActiveClass={style.tabActive}>
						{emojiTabs.map(emojiTabItem => {
							const emojis = emojiGroups[emojiTabItem.name];
							return (
								<Tab
									title={
										<img
											class={style[emojiTabItem.name]}
											src={generateEmojiUrl(emojiTabItem.unicode)}
											alt={emojiTabItem.caption}
											title={emojiTabItem.caption}
										/>
									}
									class={cx(style.tab, emojiTabItem.name)}
								>
									<VirtualList
										class={style.list}
										data={emojis}
										rowHeight={37}
										sync
										overscanCount={30}
										renderRow={this.renderEmojiRow}
									/>
								</Tab>
							);
						})}
					</Tabs>
				</Popover>
			</Localizer>
		);
	}
}

class Emoji extends Component {
	onEmojiClick = () => {
		this.props.onClick(this.props.emoji);
	};

	render({ emoji }) {
		return (
			<button class={style.emojiItem} onClick={this.onEmojiClick}>
				<img
					alt={emojione.shortnameToUnicode(emoji.shortname || emoji.icon)}
					src={generateEmojiUrl(emoji.unicode)}
					title={`${emoji.aliases_ascii[0] || `${emoji.shortname}`} ${emoji.name}`}
				/>
			</button>
		);
	}
}

function generateEmojiUrl(unicode) {
	return require(`emojione/assets/svg/${unicode}.svg`);
}

export function getEmojiPropsFromShortName(shortname) {
	const unicodeEmoji = emojione.shortnameToUnicode(shortname);
	if (unicodeEmoji === shortname) return;
	return {
		name: shortname,
		url: generateEmojiUrl(
			String(unicodeEmoji)
				.codePointAt(0)
				.toString(16)
		)
	};
}
