import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { Button, Icon } from '@zimbra/blocks';
import FilterRuleTests from './filter-rule-tests';
import FilterRuleAction from './filter-rule-action';
import FilterRuleModal from './filter-modal';
import FilterRuleRemoveModal from './filter-rule-remove-modal';
import findIndex from 'lodash-es/findIndex';
import cloneDeep from 'lodash-es/cloneDeep';
import cx from 'classnames';
import { callWith } from '../../../lib/util';

import style from '../style';
import { isFilterSupported } from '../../../utils/filter';
import withMediaQuery from '../../../enhancers/with-media-query/index';
import { minWidth, screenSm } from '../../../constants/breakpoints';
@withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
export default class FiltersSettings extends Component {
	state = {
		selected: null,
		filterRuleModal: {
			open: false,
			value: null
		},
		filterRuleRemoveModal: {
			open: false
		}
	};

	handleSelectFilterRule = filterRule => {
		this.setState({ selected: filterRule });
	};

	handleAddFilter = () => {
		this.setState({
			selected: null,
			filterRuleModal: {
				open: true,
				value: null
			}
		});
	};

	handleEditFilter = () => {
		if (this.state.selected) {
			this.setState({
				filterRuleModal: {
					open: true,
					value: this.state.selected
				}
			});
		}
	};

	handleRemoveFilter = () => {
		if (this.state.selected) {
			this.setState({
				filterRuleRemoveModal: {
					open: true,
					value: this.state.selected
				}
			});
		}
	};

	handleFilterIdxChange = idxModifier => () => {
		if (this.state.selected) {
			const filters = cloneDeep(this.props.value.filters);
			const selectedIdx = findIndex(
				this.props.value.filters,
				filter => filter === this.state.selected
			);
			if (selectedIdx + idxModifier >= 0 && selectedIdx + idxModifier <= filters.length - 1) {
				const displacedItem = filters[selectedIdx + idxModifier];
				filters[selectedIdx + idxModifier] = filters[selectedIdx];
				filters[selectedIdx] = displacedItem;
				this.props.onFieldChange('filters')({ target: { value: filters } });
				this.setState({ selected: filters[selectedIdx + idxModifier] });
			}
		}
	};

	handleFilterRuleModalAction = filterRule => {
		if (filterRule) {
			const filters = cloneDeep(this.props.value.filters);
			const selectedIdx = findIndex(
				this.props.value.filters,
				filter => filter === this.state.selected
			);
			filters[selectedIdx === -1 ? filters.length : selectedIdx] = filterRule;
			this.props.onFieldChange('filters')({ target: { value: filters } });
			this.setState({
				selected: filterRule
			});
		}
		this.setState({
			filterRuleModal: {
				open: false,
				value: null
			}
		});
	};

	handleFilterRuleRemoveModalAction = result => {
		if (result && this.state.selected) {
			const filters = cloneDeep(this.props.value.filters);
			const selectedIdx = findIndex(
				this.props.value.filters,
				filter => filter === this.state.selected
			);
			filters.splice(selectedIdx, 1);
			this.props.onFieldChange('filters')({ target: { value: filters } });
			this.setState({ selected: null });
		}
		this.setState({
			filterRuleRemoveModal: {
				open: false,
				value: null
			}
		});
	};

	render({ value, matchesScreenSm }, { selected, filterRuleModal, filterRuleRemoveModal }) {
		return (
			<div>
				<div class={cx(style.sectionTitle, style.hideMdUp)}>
					<Text id="settings.filterRuleModal.mainTitle" />
				</div>
				<div class={style.subsection}>
					<div class={cx(style.subsectionTitle, style.filtersSubsectionTitle)}>
						<Text
							fields={{ currentlyUsed: value.filters.length }}
							id="settings.filterRuleModal.sortIntoFoldersLabel"
						>
							Sort incoming messages into folders ({value.filters.length} of 1000 used)
						</Text>
					</div>
					<div class={style.subsectionBody}>
						<div>
							<Button
								class={style.subsectionBodyButton}
								onClick={this.handleAddFilter}
								disabled={value.filters.length >= 1000}
							>
								<Text id="buttons.add" />
							</Button>
							<Button
								class={style.subsectionBodyButton}
								onClick={this.handleEditFilter}
								disabled={!selected}
							>
								<Text id="buttons.edit" />
							</Button>
							<Button
								class={style.subsectionBodyButton}
								onClick={this.handleRemoveFilter}
								disabled={!selected}
							>
								<Text id="buttons.remove" />
							</Button>
							<div class={style.filtersControls}>
								<div onClick={this.handleFilterIdxChange(-1)}>
									<Icon class={style.arrow} name="arrow-up" />
								</div>
								<div onClick={this.handleFilterIdxChange(1)}>
									<Icon class={style.arrow} name="arrow-down" />
								</div>
							</div>
						</div>
						<ul class={style.filtersList}>
							{value.filters.map(
								filter =>
									isFilterSupported(filter) && (
										<li
											class={cx(style.filtersListEntry, filter === selected && style.selected)}
											onClick={callWith(this.handleSelectFilterRule, filter)}
										>
											{filter.name}
										</li>
									)
							)}
						</ul>
						{selected && (
							<div>
								<FilterRuleAction action={selected.actions[0]} />{' '}
								<Text id="settings.filterRuleModal.if" />
								<FilterRuleTests test={selected.conditions[0]} />
								<p class={style.filterProcessLabel}>
									{selected.actions[0].stop ? (
										<Text id="settings.filterRuleModal.stopProcessing" />
									) : (
										<Text id="settings.filterRuleModal.allowProcessing" />
									)}
								</p>
							</div>
						)}
					</div>
				</div>
				{filterRuleModal.open && (
					<FilterRuleModal
						value={filterRuleModal.value}
						matchesScreenSm={matchesScreenSm}
						onSave={this.handleFilterRuleModalAction}
						onClose={callWith(this.handleFilterRuleModalAction, null)}
					/>
				)}
				{filterRuleRemoveModal.open && (
					<FilterRuleRemoveModal
						onResult={this.handleFilterRuleRemoveModalAction}
						value={filterRuleRemoveModal.value}
					/>
				)}
			</div>
		);
	}
}
