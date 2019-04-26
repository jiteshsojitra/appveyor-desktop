import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import moment from 'moment-timezone';
import cx from 'classnames';
import { Icon } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import { route } from 'preact-router';

import { DATE_FORMAT } from '../../constants/search';
import DateInput from '../date-input';
import { callWith } from '../../lib/util';
import { updateQuery } from '../../utils/query-params';
import style from './style.less';

const EVENT_TYPES = ['appointment', 'task'];

@connect(state => ({ url: state.url }))
export default class RefinerListSection extends Component {
	state = {
		expanded: true
	};

	handleToggleExpanded = () => {
		this.setState({ expanded: !this.state.expanded });
	};

	handleTypeSelect = eventType => {
		if (this.props.types === eventType) {
			route(updateQuery({ types: 'appointment,task' }));
		} else {
			route(updateQuery({ types: eventType }));
		}
	};

	setBeforeDate = date => {
		route(
			updateQuery({
				before: moment(date).format(DATE_FORMAT)
			})
		);
	};

	setAfterDate = date => {
		route(
			updateQuery({
				after: moment(date).format(DATE_FORMAT)
			})
		);
	};

	clearBeforeDate = () => {
		route(
			updateQuery({
				before: undefined
			})
		);
	};

	clearAfterDate = () => {
		route(
			updateQuery({
				after: undefined
			})
		);
	};

	render = ({ before, after, type, types, label }, { expanded }) => {
		const renderTypeFilter = () => (
			<ul class={style.filterList}>
				{EVENT_TYPES.map(eventType => (
					<li
						class={cx(style.eventFilter, types === eventType && style.selectedFilter)}
						onClick={callWith(this.handleTypeSelect, eventType)}
					>
						<span>{eventType === 'task' ? 'Tasks' : 'Events'}</span>
					</li>
				))}
			</ul>
		);
		const renderDateFilter = () => (
			<div class={style.dateFilter}>
				<DateInput
					class={style.dateInput}
					dateValue={after && moment(after, DATE_FORMAT)}
					onDateChange={this.setAfterDate}
					onClear={this.clearAfterDate}
					enableClear
					format="DD/MM/YY"
				/>
				<span>
					<Text id="prepositions.to" />
				</span>
				<DateInput
					class={style.dateInput}
					dateValue={before && moment(before, DATE_FORMAT)}
					onDateChange={this.setBeforeDate}
					onClear={this.clearBeforeDate}
					enableClear
					format="DD/MM/YY"
				/>
			</div>
		);

		return (
			<li class={style.group}>
				<div class={style.groupToggle} onClick={this.handleToggleExpanded}>
					<Icon name={expanded ? 'angle-down' : 'angle-right'} size="xs" />
				</div>
				<div class={style.groupHeader}>
					<div class={style.groupName}>{label}</div>
				</div>

				{expanded
					? type === 'typeFilter'
						? renderTypeFilter()
						: type === 'dateFilter'
						? renderDateFilter()
						: null
					: null}
			</li>
		);
	};
}
