import { h } from 'preact';

import s from './style.less';

export function GridlineLabelSpacer({ labelHeight }) {
	return <div class={s.tableGridlineLabelSpacer} style={{ height: labelHeight }} />;
}

export default function GridlineLabels({ cellWidth, labelHeight, labels }) {
	return (
		<div style={{ height: labelHeight, paddingLeft: cellWidth / 2 }} class={s.tableGridlineLabels}>
			{labels.map((label, idx) => (
				<div
					style={
						idx === labels.length - 1
							? { width: cellWidth / 2, textAlign: 'right' }
							: { width: cellWidth }
					}
				>
					{label}
				</div>
			))}
		</div>
	);
}
