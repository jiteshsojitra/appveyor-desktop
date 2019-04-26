import { h } from 'preact';
import { Text } from 'preact-i18n';

import RefinerListSection from './refiner-list-section';
import style from './style.less';

const RefinerList = ({ after, before, items, filterItems, types }) => {
	const refinerSections = [
		{ type: 'typeFilter', name: <Text id="calendar.search.filters.type" /> },
		{ type: 'dateFilter', name: <Text id="calendar.search.filters.date" /> }
	];
	return (
		<div>
			<div class={style.refineHeader}>
				<Text id="calendar.search.refineHeader" />:
			</div>
			<ul class={style.groupList}>
				{refinerSections.map(({ type, name }) => (
					<RefinerListSection
						after={after}
						before={before}
						filterItems={filterItems}
						items={items}
						label={name}
						type={type}
						types={types}
					/>
				))}
			</ul>
		</div>
	);
};

export default RefinerList;
