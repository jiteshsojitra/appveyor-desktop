import { h, Component } from 'preact';
import cx from 'classnames';
import debounce from 'lodash-es/debounce';
import { groupByList } from '../../constants/mailbox-metadata';
import { connect } from 'preact-redux';
import { getMailboxMetadata } from '../../graphql-decorators/mailbox-metadata';
import { setScroll } from '../../store/email/actions';
import MailListItem from '../mail-list-item';
import orderedGroupByPairs from '../../utils/ordered-group-by-pairs';
import { getDateKey } from '../../lib/util';
import ZimletSlot from '../zimlet-slot';

import s from './style.less';

const SCROLL_BUFFER = 500;

@getMailboxMetadata()
@connect(
	state => ({
		scrollPos: state.email.scroll || {}
	}),
	{
		setScroll
	}
)
export default class MailList extends Component {
	listRef = c => {
		this.list = c;
	};

	groupItems = () => {
		const { items, sortBy, groupByList: groupBy } = this.props;

		if (groupBy === groupByList.values.date && (!sortBy || sortBy.match(/^date/))) {
			return orderedGroupByPairs(items.data, m => getDateKey(m.date));
		}

		return [[null, items.data]];
	};

	handleSubScroll = () => {
		if (!this.list || !this.base) {
			return;
		}
		const offset = this.list.scrollTop;
		const max = this.list.scrollHeight - this.list.offsetHeight;

		if (offset === 0) {
			this.props.toggleInlineSearchVisibility(true);
		} else {
			this.props.toggleInlineSearchVisibility(false);
		}

		if (offset > max - window.innerHeight / 2 - SCROLL_BUFFER) {
			this.props.onScroll();
		}
	};

	static defaultProps = {
		sortBy: '',
		viewingId: null,
		wide: true,
		selectedIds: new Set()
	};

	componentDidMount() {
		if (!this.list || !this.base) {
			return;
		}
		const { scrollPos, folderName, prevLocation } = this.props;
		if (scrollPos[folderName] && prevLocation && prevLocation.href.indexOf('email') !== -1) {
			this.list.scrollTop = scrollPos[folderName];
		}
	}

	componentWillReceiveProps(nextProps) {
		if (!this.list) {
			return;
		}

		if (nextProps.clicked) {
			this.list.scrollTop = 0;
			this.props.setClicked();
		}
		if (nextProps.folderName !== this.props.folderName) {
			this.list.scrollTop = 0;
		}
	}

	componentWillUnmount() {
		if (this.list) {
			this.props.setScroll({ [this.props.folderName]: this.list.scrollTop });
		}
	}

	render({
		items,
		handleItemClick,
		handleItemDblClick,
		handleItemCheckboxSelect,
		onSpam,
		onArchive,
		onBlock,
		onPrint,
		onAddToContacts,
		selectedIds,
		showSnippets,
		viewingId,
		sortBy,
		messageListDensity,
		type,
		account,
		folderName,
		mailboxMetadata, // unused
		smartFolderTreeOpen, // unused
		foldersExpanded, // unused
		shouldNotBeMarkedRead,
		toggleAllowedFolders,
		isOffline,
		renderOfflineMessage,
		...props
	}) {
		// Remove unused props from getMailboxMetadata
		return (
			<div
				{...props}
				class={cx(s.scrollableList, props.class)}
				ref={this.listRef}
				onScroll={debounce(this.handleSubScroll, 200)}
				tabIndex="0"
			>
				{items.data &&
					this.groupItems().map(([label, itemsByDate], index) => (
						<div class={s.messageGroup}>
							{label && (
								<div class={cx(s.dateRowLabel, s.hideSmDown, props.wide && s.wideDateRowLabel)}>
									{label}
								</div>
							)}
							{index === 0 && <ZimletSlot name="top-mail-ad-item" props class={s.listTopper} />}
							<div>
								{itemsByDate.map(i => (
									<MailListItem
										{...props}
										item={i}
										account={account}
										folderName={folderName}
										type={type}
										isViewing={selectedIds.size === 0 && viewingId === String(i.id)}
										isSelected={Array.from(selectedIds).find(e => e.id === i.id)}
										selectedIds={selectedIds}
										onClick={handleItemClick}
										onDblClick={handleItemDblClick}
										onMarkSpam={onSpam}
										onArchive={onArchive}
										onAddToContacts={onAddToContacts}
										onBlock={onBlock}
										onPrint={onPrint}
										onCheckboxSelect={handleItemCheckboxSelect}
										showSnippet={showSnippets}
										density={messageListDensity}
										toggleAllowedFolders={toggleAllowedFolders}
										showSize={sortBy.indexOf('size') === 0}
										shouldNotBeMarkedRead={shouldNotBeMarkedRead}
									/>
								))}
							</div>
						</div>
					))}
				{isOffline && renderOfflineMessage && renderOfflineMessage()}
			</div>
		);
	}
}
