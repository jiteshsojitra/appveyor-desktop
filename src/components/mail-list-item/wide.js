import { h } from 'preact';
import { Localizer, Text } from 'preact-i18n';
import cx from 'classnames';
import prettyBytes from 'pretty-bytes';
import get from 'lodash/get';
import { Icon, ChoiceInput } from '@zimbra/blocks';
import ListItemEmailAddresses from './list-item-email-addresses';
import UnreadControl from '../unread-control';
import MailInlineActionControl from '../mail-inline-action-control';
import EmailTime from '../email-time';

import s from './style';

function stopPropagation(e) {
	e.stopPropagation();
}

const WideListItem = ({
	item,
	count,
	isAttachment,
	isDraft,
	isFlagged,
	isSelected,
	isUnread,
	isUrgent,
	showSize,
	onCheckbox,
	onInlineDelete,
	onToggleFlagged,
	onToggleUnread,
	onInlineSearch,
	emailAddresses,
	showFolderName,
	showSnippet,
	disableInlineSearch,
	localFolder
}) => {
	let messageOrConvSize;
	if (showSize) {
		let size = +item.sortField || +item.size;
		if (!size) {
			size = (get(item, 'messages') || []).reduce((max, { size: sz }) => Math.max(max, +sz), 0);
		}
		messageOrConvSize = <span class={s.size}>{prettyBytes(size)}</span>;
	}

	return (
		<div class={s.wideListItem}>
			<Localizer>
				<ChoiceInput
					aria-label={<Text id="mail.selectEmail" />}
					checked={isSelected}
					onClick={onCheckbox}
					onDblClick={stopPropagation}
					containerClass={cx(s.wideCheckbox, s.wideArea)}
				/>
			</Localizer>
			{!localFolder && (
				<UnreadControl
					class={s.unreadControl}
					onChange={onToggleUnread}
					value={isUnread}
					localFolder={localFolder}
				/>
			)}
			<div class={s.wideListItemSenderCol}>
				<div class={s.wideListItemSender}>
					<ListItemEmailAddresses emailAddresses={emailAddresses} />
					{isDraft && (
						<span>
							{emailAddresses.length > 0 ? ', ' : ''}
							<span class={s.draft}>
								<Text id="mail.DRAFT" />
							</span>
						</span>
					)}
				</div>
				<div>
					{!disableInlineSearch && !localFolder && (
						<MailInlineActionControl
							name="search"
							className={s.inlineControl}
							onChange={onInlineSearch}
						/>
					)}
					{!localFolder && [
						<MailInlineActionControl
							name="trash"
							className={s.inlineControl}
							onChange={onInlineDelete}
						/>,
						<MailInlineActionControl
							name="star"
							className={s.inlineControl}
							activeClassName={s.starred}
							value={isFlagged}
							onChange={onToggleFlagged}
						/>
					]}
				</div>
			</div>
			<div class={s.wideListItemSubject}>
				<h4 class={cx(s.subject, s.wideSubject)} title={item.subject}>
					{item.subject || <Text id="mail.noSubject" />}
					{count && count > 1 ? <span> ({count})</span> : null}
				</h4>
			</div>
			<div class={cx(s.excerpt, s.wideExcerpt)}>{(showSnippet && item.excerpt) || ' '}</div>

			{showFolderName && item.folder && <div>{item.folder.name}</div>}

			<div class={s.wideListItemTimeCol}>
				{isUrgent && <span class={s.urgent}>🚩</span>}
				{isAttachment && <Icon class={s.attachment} name="paperclip" />}
				{messageOrConvSize}
				<EmailTime time={item.date} />
			</div>
		</div>
	);
};

export default WideListItem;
