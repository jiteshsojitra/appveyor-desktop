import { h } from 'preact';

import { hoursDecimal } from '../../utils/free-busy';

import s from './style.less';

export default function EventOutline({ event, cellWidth, labelHeight }) {
	const left = cellWidth * hoursDecimal(event.start);
	const width = cellWidth * hoursDecimal(event.end) - left;
	return <div class={s.eventOutline} style={{ left, width, top: labelHeight }} />;
}
