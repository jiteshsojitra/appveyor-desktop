import { h } from 'preact';
import { Text } from 'preact-i18n';
import Search from '../search';
import cx from 'classnames';

import s from './style.less';

const CalendarSearchToolbar = ({ count, more, types, matchesScreenMd, searchInline }) => (
	<div>
		{matchesScreenMd && searchInline && (
			<div className={cx(s.toolbar, s.searchContainer)}>
				<div class={s.searchInput}>
					<Search searchInline={searchInline} />
				</div>
			</div>
		)}
		<div class={s.toolbar}>
			<Text
				id="calendar.search.results"
				fields={{
					types,
					count: more ? `${count}+` : count
				}}
			/>
		</div>
	</div>
);

export default CalendarSearchToolbar;
