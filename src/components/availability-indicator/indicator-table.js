import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import RowHeader from './row-header';
import RowBody from './row-body';
import Gridlines from './gridlines';
import GridlineLabels, { GridlineLabelSpacer } from './gridline-labels';
import EventOutline from './event-outline';
import { Spinner } from '@zimbra/blocks';

import s from './style.less';

const CELL_WIDTH = 39;
const CELL_LABELS = [
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'10',
	'11',
	'NOON',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'10',
	'11',
	'12'
];
const CELL_LABEL_HEIGHT = 20;
const LEGEND_STATUS = ['nonworking', 'free', 'busy', 'tentative', 'unavailable', 'nodata'];

export default function IndicatorTable({ freeBusy, onChangeIsRequired, event }) {
	const renderRowBody =
		freeBusy &&
		freeBusy.map(({ statuses }) => <RowBody statuses={statuses} cellWidth={CELL_WIDTH} />);

	const renderRowHeader =
		freeBusy &&
		freeBusy.map(({ attendee, disableRequiredToggle, isRequired, disableToggle }) => (
			<IndicatorTableRowHeader
				attendee={attendee}
				disableRequiredToggle={disableRequiredToggle}
				onChangeIsRequired={onChangeIsRequired}
				isRequired={isRequired}
				disableToggle={disableToggle}
			/>
		));

	const renderLegend = LEGEND_STATUS.map(status => (
		<div class={s.legendIndicator}>
			<div class={cx(s.displayPattern, s[`${status}Indicator`])} />
			<div class={s.statusText}>
				<Text id={`calendar.editModal.availability.status.${status}`} />
			</div>
		</div>
	));
	return freeBusy ? (
		<div class={s.availabilityTable}>
			<div class={s.tableHeader}>
				<GridlineLabelSpacer labelHeight={CELL_LABEL_HEIGHT} />
				{renderRowHeader}
			</div>
			<div class={s.tableBodyWrapper}>
				<div class={s.tableBody}>
					<div style={{ width: CELL_WIDTH * CELL_LABELS.length }}>
						<GridlineLabels
							cellWidth={CELL_WIDTH}
							labelHeight={CELL_LABEL_HEIGHT}
							labels={CELL_LABELS}
						/>
						{renderRowBody}
						<Gridlines
							labels={CELL_LABELS}
							cellWidth={CELL_WIDTH}
							labelHeight={CELL_LABEL_HEIGHT}
						/>
						<EventOutline labelHeight={CELL_LABEL_HEIGHT} cellWidth={CELL_WIDTH} event={event} />
					</div>
				</div>
				<div class={s.legend}>{renderLegend}</div>
			</div>
		</div>
	) : (
		<div class={s.availabilityTableLoading}>
			<Spinner class={s.spinner} />
			<div class={s.text}>
				<Text id="app.loading" />
			</div>
		</div>
	);
}

class IndicatorTableRowHeader extends Component {
	partialOnChangeIsRequired = role => this.props.onChangeIsRequired(this.props.attendee, role);

	render({ attendee, disableRequiredToggle, isRequired, disableToggle }) {
		return (
			<RowHeader
				attendee={attendee}
				disableRequiredToggle={disableRequiredToggle}
				onChangeIsRequired={this.partialOnChangeIsRequired}
				isRequired={isRequired}
				disableToggle={disableToggle}
			/>
		);
	}
}
