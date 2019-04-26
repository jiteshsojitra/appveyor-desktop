import { h } from 'preact';
import { Text } from 'preact-i18n';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { compose } from 'recompose';
import { ChoiceInput } from '@zimbra/blocks';

import ActionMenuMailSort from '../action-menu-mail-sort';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import Search from '../search';
import { configure } from '../../config';

import s from './style.less';

const MailListHeader = ({
	searchInline,
	searchScreen,
	selected,
	allSelected,
	currentFolder,
	sortBy,
	onToggleSelectAll,
	onSort,
	onGroupByChange,
	children,
	wide,
	matchesMediaQuery,
	query,
	queryEmail,
	localFolder,
	...rest
}) => {
	const showSelected = !matchesMediaQuery && (currentFolder || searchScreen) && selected.size > 0;
	const showUnread = !matchesMediaQuery && currentFolder && !showSelected;
	return (
		<div
			{...rest}
			class={cx(
				s.mailListHeader,
				wide && s.wide,
				rest.class,
				searchInline && !searchScreen && s.sectionSearch
			)}
		>
			{searchInline && !searchScreen && matchesMediaQuery && (
				<div class={cx(s.row)}>
					<Search showDropDown searchInline={searchInline} />
				</div>
			)}
			<div class={cx(!searchInline && s.removeBorder, s.row, s.sort)}>
				<div class={s.leftContainer}>
					<ChoiceInput
						indeterminate={selected.length > 0 && !allSelected}
						checked={allSelected}
						onChange={onToggleSelectAll}
					/>
					{showUnread && (
						<div class={s.title}>
							{currentFolder.name}
							{currentFolder.unread > 0 && <span class={s.count}>{currentFolder.unread}</span>}
						</div>
					)}
					{showSelected && (
						<div class={s.title}>
							<Text id="mail.selected" />
							<span class={s.count}>{selected.size}</span>
						</div>
					)}
				</div>
				{children}
				<ActionMenuMailSort sortBy={sortBy} onSort={onSort} localFolder={localFolder} />
			</div>
		</div>
	);
};

MailListHeader.defaultProps = {
	allSelected: false
};

MailListHeader.propTypes = {
	selected: PropTypes.array.isRequired,
	allSelected: PropTypes.bool,
	onToggleSelectAll: PropTypes.func.isRequired
};

export default compose(
	configure({ searchInline: 'searchInline' }),
	withMediaQuery(minWidth(screenMd))
)(MailListHeader);
