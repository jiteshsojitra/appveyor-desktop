import { h } from 'preact';

import { hoursDecimal } from '../../utils/free-busy';

import s from './style.less';

export default function RowBody({ statuses, cellWidth }) {
	return (
		<div class={s.tableRowBody}>
			{statuses.map(({ status, start, end }) => {
				const left = cellWidth * hoursDecimal(start);
				const width = cellWidth * hoursDecimal(end) - left;
				return <div class={s[`${status}Indicator`]} style={{ left, width }} />;
			})}
		</div>
	);
}
