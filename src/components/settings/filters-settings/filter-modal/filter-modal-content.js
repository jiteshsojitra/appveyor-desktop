import { Component, h } from 'preact';
import { Text } from 'preact-i18n';
import Select from '../../../select';
import { ChoiceInput } from '@zimbra/blocks';
import style from './style.less';
import cx from 'classnames';
import get from 'lodash-es/get';
import concat from 'lodash-es/concat';
import set from 'lodash-es/set';
import toPairs from 'lodash-es/toPairs';
import findIndex from 'lodash-es/findIndex';
import merge from 'lodash-es/merge';
import has from 'lodash-es/has';
import cloneDeep from 'lodash-es/cloneDeep';
import { flattenFolders } from '../../../../utils/folders';
import { withProps } from 'recompose';
import getMailFolders from '../../../../graphql-decorators/get-mail-folders';
import {
	FILTER_TEST_TYPE,
	FILTER_CONDITION_DISPLAY,
	RULE_PREDICATE_OPTIONS,
	RULE_ACTION_PATH,
	RULE_PATH_PREFIX
} from '../../../../constants/filter-rules';
import { OUTBOX, DRAFTS, SENT, INBOX, INBOXINUPPERCASE } from '../../../../constants/folders';

// Strips the leading  `/` from a folder path if it exists.
const normalizePath = (absFolderPath = '') =>
	absFolderPath.charAt(0) === '/' ? absFolderPath.slice(1) : absFolderPath;

const dropFolderFilter = ({ absFolderPath }) =>
	!absFolderPath.match(`/?(${OUTBOX}|${INBOX}|${INBOXINUPPERCASE}|${SENT}|${DRAFTS})$`);

// Finds the selected option to display that corresponds to the current state
// of the filterTest. If the filter test contains the option update, we know
// that this is the currently selected option.
const findRulePredicateOption = filterTest => {
	// Some predicate keys are optional, set defaults if they do not exist.
	const filterTestWithDefaults = merge({}, { negative: false, part: 'all' }, filterTest);

	const predicateOptionKey = Object.keys(RULE_PREDICATE_OPTIONS).find(optionKey => {
		const option = RULE_PREDICATE_OPTIONS[optionKey];
		return toPairs(option.update).every(([key, value]) => filterTestWithDefaults[key] === value);
	});
	return RULE_PREDICATE_OPTIONS[predicateOptionKey];
};

const FILTER_CONDITIONS_CONFIG = [
	{
		label: FILTER_CONDITION_DISPLAY.FROM,
		getRulePath: filterTest => {
			const addressTestIdx = findIndex(
				filterTest[FILTER_TEST_TYPE.ADDRESS],
				address => address.header === 'from'
			);
			return [FILTER_TEST_TYPE.ADDRESS, String(addressTestIdx)];
		},
		predicateOptions: [
			RULE_PREDICATE_OPTIONS.MATCHES_EXACTLY,
			RULE_PREDICATE_OPTIONS.DOES_NOT_MATCH_EXACTLY,
			RULE_PREDICATE_OPTIONS.CONTAINS,
			RULE_PREDICATE_OPTIONS.DOES_NOT_CONTAIN,
			RULE_PREDICATE_OPTIONS.MATCHES_WILDCARD,
			RULE_PREDICATE_OPTIONS.DOES_NOT_MATCH_WILDCARD
		]
	},
	{
		label: FILTER_CONDITION_DISPLAY.TO_OR_CC,
		getRulePath: filterTest => {
			const addressTestIdx = findIndex(
				filterTest[FILTER_TEST_TYPE.ADDRESS],
				address => address.header === 'to,cc'
			);
			return [FILTER_TEST_TYPE.ADDRESS, String(addressTestIdx)];
		},
		predicateOptions: [
			RULE_PREDICATE_OPTIONS.MATCHES_EXACTLY,
			RULE_PREDICATE_OPTIONS.DOES_NOT_MATCH_EXACTLY,
			RULE_PREDICATE_OPTIONS.CONTAINS,
			RULE_PREDICATE_OPTIONS.DOES_NOT_CONTAIN,
			RULE_PREDICATE_OPTIONS.MATCHES_WILDCARD,
			RULE_PREDICATE_OPTIONS.DOES_NOT_MATCH_WILDCARD
		]
	},
	{
		label: FILTER_CONDITION_DISPLAY.SUBJECT,
		getRulePath: filterTest => {
			const headerTestIdx = findIndex(
				filterTest[FILTER_TEST_TYPE.HEADER],
				header => header.header === 'subject'
			);
			return [FILTER_TEST_TYPE.HEADER, String(headerTestIdx)];
		},
		predicateOptions: [
			RULE_PREDICATE_OPTIONS.MATCHES_EXACTLY,
			RULE_PREDICATE_OPTIONS.DOES_NOT_MATCH_EXACTLY,
			RULE_PREDICATE_OPTIONS.CONTAINS,
			RULE_PREDICATE_OPTIONS.DOES_NOT_CONTAIN,
			RULE_PREDICATE_OPTIONS.MATCHES_WILDCARD,
			RULE_PREDICATE_OPTIONS.DOES_NOT_MATCH_WILDCARD
		]
	},
	{
		label: FILTER_CONDITION_DISPLAY.BODY,
		getRulePath: () => [FILTER_TEST_TYPE.BODY, '0'],
		predicateOptions: [
			RULE_PREDICATE_OPTIONS.BODY_CONTAINS,
			RULE_PREDICATE_OPTIONS.BODY_DOES_NOT_CONTAIN
		]
	}
];

@getMailFolders()
@withProps(({ folders }) => ({
	folders: flattenFolders(folders)
		.filter(folder => dropFolderFilter(folder))
		.map(({ absFolderPath }) => normalizePath(absFolderPath))
}))
export default class FilterModalContent extends Component {
	onRulePredicateChange = rulePath => ev => {
		const value = cloneDeep(this.props.value);
		const rule = get(value, rulePath);
		const predicateForValue = RULE_PREDICATE_OPTIONS[ev.target.value];
		merge(rule, predicateForValue.update);
		this.props.onChange(set(value, rulePath, rule));
	};

	onRuleValueChange = rulePath => ev => {
		const value = cloneDeep(this.props.value);
		const rule = get(value, rulePath);
		rule.value = ev.target.value;
		this.props.onChange(set(value, rulePath, rule));
	};

	onRuleMatchCaseChange = rulePath => () => {
		const value = cloneDeep(this.props.value);
		const rule = get(value, rulePath);
		rule.caseSensitive = has(rule, 'caseSensitive') ? !rule.caseSensitive : true;
		this.props.onChange(set(value, rulePath, rule));
	};

	onMoveIntoFolderChange = ev => {
		const value = cloneDeep(this.props.value);
		const action = get(value, RULE_ACTION_PATH);
		action.folderPath = ev.target.value;
		this.props.onChange(set(value, RULE_ACTION_PATH, action));
	};

	onRuleNameChange = ev => {
		const value = cloneDeep(this.props.value);
		value.name = ev.target.value;
		this.props.onChange(value);
	};

	onProcessAdditionalChange = e => {
		const value = cloneDeep(this.props.value);

		if (e.target.checked) {
			value.actions[0].stop = [{ index: 1 }];
		} else {
			delete value.actions[0].stop;
		}

		this.props.onChange(value);
	};

	componentWillReceiveProps({ value, folders }) {
		const clonedValue = cloneDeep(value);

		// For `NEW_FILTER_RULE`, we get "Inbox" as folderPath, but since we have filtered it out, UI displays blank Select dropdown.
		// Also, we can't hard-code any Folder Path in `NEW_FILTER_RULE` because the first index'th fodername is dynamic.

		if (get(clonedValue, 'actions[0].fileInto[0].folderPath') === INBOX) {
			this.props.onChange(set(clonedValue, 'actions[0].fileInto[0].folderPath', folders[0]));
		}
	}

	renderMatchCaseLabel = (rule, rulePath) => (
		<label class={rule.caseSensitive ? cx(style.checkbox, style.checked) : style.checkbox}>
			<ChoiceInput onChange={this.onRuleMatchCaseChange(rulePath)} checked={rule.caseSensitive} />
			<Text id="settings.filterRuleModal.caseSensitive">Match case</Text>
		</label>
	);

	render({ value, folders, matchesScreenMd, title }) {
		const moveIntoFolderAction = get(value, RULE_ACTION_PATH);
		const selectedFolderPath = folders.find(
			folderPath => moveIntoFolderAction.folderPath === folderPath
		);
		const processAdditionalDiv = [
			<div class={style.processAdditional}>
				<label>
					<input
						onChange={this.onProcessAdditionalChange}
						type="checkbox"
						checked={value.actions[0].stop}
					/>
					<Text id="settings.filterRuleModal.stopProcessing" />
				</label>
			</div>
		];
		return (
			<div class={style.filterModalContent}>
				<div class={cx(style.subsection, style.titleSubsection)}>
					{!matchesScreenMd && title && (
						<div class={style.title}>
							<Text id={title}>{title} </Text>
						</div>
					)}
					<div class={cx(style.subsectionTitle, style.filterSubsectionTitle)}>
						<Text id="settings.filterRuleModal.filterNameLabel">Filter Name</Text>
					</div>
					<div class={style.subsectionBody}>
						<input
							class={cx(style.textInput, style.textInputOfFilter)}
							type="text"
							onChange={this.onRuleNameChange}
							value={value.name}
						/>
					</div>
				</div>
				<div class={style.rulePrompt}>
					<Text id="settings.filterRuleModal.rulePrompt">
						If an incoming message meets all of these conditions:
					</Text>
				</div>
				<div class={style.ruleSection}>
					{FILTER_CONDITIONS_CONFIG.map(({ label, getRulePath, predicateOptions }) => {
						const rulePath = concat(RULE_PATH_PREFIX, getRulePath(get(value, RULE_PATH_PREFIX)));
						const rule = get(value, rulePath, {});
						const selectedPredicateOption = findRulePredicateOption(rule);
						return (
							<div class={style.subsection}>
								<div class={style.subsectionTitle}>{label}</div>
								<div class={style.subsectionBody}>
									<div class={cx(style.half, style.inline)}>
										<Select
											value={selectedPredicateOption.value}
											onChange={this.onRulePredicateChange(rulePath)}
											fullWidth
										>
											{predicateOptions.map(option => (
												<option value={option.value}>{option.label}</option>
											))}
										</Select>
									</div>
									<input
										class={cx(style.textInput, style.textInputOfFilter)}
										type="text"
										onChange={this.onRuleValueChange(rulePath)}
										value={rule.value}
									/>
									{matchesScreenMd && this.renderMatchCaseLabel(rule, rulePath)}
								</div>
								{!matchesScreenMd && this.renderMatchCaseLabel(rule, rulePath)}
							</div>
						);
					})}
				</div>
				<div class={cx(style.subsection, style.moveMessageSubsection)}>
					<div class={cx(style.subsectionTitle, style.moveIntoFolderLabel)}>
						<Text id="settings.filterRuleModal.moveIntoFolderLabel">
							Then move the messages to this folder
						</Text>
					</div>
					<div class={style.subsectionBody}>
						<div class={cx(style.half, style.inline, style.fullWidthForMobileView)}>
							<Select value={selectedFolderPath} onChange={this.onMoveIntoFolderChange} fullWidth>
								{folders.map(folderPath => (
									<option value={folderPath}>{folderPath}</option>
								))}
							</Select>
						</div>
						{matchesScreenMd && processAdditionalDiv}
					</div>
					{!matchesScreenMd && processAdditionalDiv}
				</div>
			</div>
		);
	}
}
