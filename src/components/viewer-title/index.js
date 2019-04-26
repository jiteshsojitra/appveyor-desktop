import { h } from 'preact';
import { Text } from 'preact-i18n';

import StarIcon from '../star-icon';
import UnreadControl from '../unread-control';

import cx from 'classnames';
import s from './style.less';

const ViewerTitle = ({
	subject,
	count,
	isFlagged,
	isUnread,
	onStar,
	onMarkRead,
	className,
	matchesScreenMd,
	matchesScreenSm,
	localFolder
}) => {
	const showCount = count && count > 1;
	const countText = matchesScreenSm ? `(${count})` : count;
	return (
		<div class={cx(s.header, className)}>
			<StarIcon
				class={s.star}
				onClick={!localFolder && onStar}
				starred={isFlagged}
				size={matchesScreenMd ? 'sm' : 'md'}
				localFolder={localFolder}
			/>
			<UnreadControl
				class={cx(s.readStatus, s.hideXsDown)}
				onChange={!localFolder && onMarkRead}
				value={isUnread}
				visible
				localFolder={localFolder}
			/>
			<div class={s.headerText}>
				<span class={s.subject}>{subject || <Text id="mail.noSubject" />}</span>
				{showCount && <span class={s.countText}>&nbsp;{countText}</span>}
			</div>
		</div>
	);
};

export default ViewerTitle;
