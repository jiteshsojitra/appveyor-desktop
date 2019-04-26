import { h } from 'preact';

import s from './style.less';

export default function Gridlines({ labels, cellWidth, labelHeight }) {
	return (
		<div class={s.tableGridlines}>
			{labels.map((label, idx) => (
				<div style={{ left: (idx + 1) * cellWidth, top: labelHeight }} class={s.tableGridline} />
			))}
		</div>
	);
}
