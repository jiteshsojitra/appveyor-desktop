import { h, Component } from 'preact';
import InlineModalDialog from '../../../inline-modal-dialog';
import FilterModalContent from './filter-modal-content';
import flatten from 'lodash-es/flatten';
import cloneDeep from 'lodash-es/cloneDeep';
import get from 'lodash-es/get';
import set from 'lodash-es/set';
import concat from 'lodash-es/concat';
import unset from 'lodash-es/unset';
import uniqBy from 'lodash-es/uniqBy';
import mergeWith from 'lodash-es/mergeWith';
import { Text } from 'preact-i18n';
import {
	NEW_FILTER_RULE,
	FILTER_TEST_TYPE,
	FILTER_ACTION_TYPE
} from '../../../../constants/filter-rules';

import style from './style.less';
import { Button } from '@zimbra/blocks';
import ModalDrawer from '../../../modal-drawer';
import ModalDrawerToolbar from '../../../modal-drawer-toolbar';
import withMediaQuery from '../../../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../../../constants/breakpoints';

const validate = filterRule => {
	if (!filterRule.name.trim()) {
		return <Text id="settings.filterRuleModal.validateFilterName" />;
	}
	const testPrefixPath = ['conditions', '0'];
	const tests = flatten(
		Object.keys(get(filterRule, testPrefixPath))
			.filter(testKey => testKey !== 'allOrAny')
			.map(ruleKey => get(filterRule, concat(testPrefixPath, ruleKey)))
	);
	// If a rule has a value it is valid, the predicate must exist.
	const hasAtLeastOneTest = tests.some(({ value }) => Boolean(value));
	if (!hasAtLeastOneTest) {
		return <Text id="settings.filterRuleModal.validateFilterRule" />;
	}
};

// Removes conditions without a value from the filter rule.
const normalize = filterRule => {
	const testPrefixPath = ['conditions', '0'];
	return Object.keys(get(filterRule, testPrefixPath))
		.filter(testKey => testKey !== 'allOrAny')
		.reduce((output, testKey) => {
			const testPath = concat(testPrefixPath, testKey);
			const conditions = get(output, testPath).filter(({ value }) => Boolean(value));
			conditions.length ? set(output, testPath, conditions) : unset(output, testPath);
			return output;
		}, cloneDeep(filterRule));
};
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export default class FilterModal extends Component {
	state = {
		uncommittedValue: null,
		error: null
	};

	handleChange = newUncommittedValue => {
		this.setState({
			uncommittedValue: newUncommittedValue
		});
	};

	handleSave = () => {
		const error = validate(this.state.uncommittedValue);
		if (!error) {
			this.setState({ error: null });
			const normalized = normalize(this.state.uncommittedValue);
			this.props.onSave(normalized);
		} else {
			this.setState({ error });
		}
	};

	handleClose = () => {
		this.setState({ error: null });
		this.props.onClose();
	};

	handleCloseDrawer = () => {
		this.setState({ isDrawerMounted: false });
		this.props.onClose();
	};

	componentWillMount() {
		this.setState({
			uncommittedValue: this.props.value
				? mergeWith({}, NEW_FILTER_RULE, this.props.value, (objValue, srcValue, key) => {
						if (key === FILTER_TEST_TYPE.ADDRESS && srcValue && objValue) {
							// We want all filter test rules, not duplicates due to shifted indices.
							return uniqBy([...srcValue, ...objValue], ({ header }) => header);
						} else if (key === FILTER_ACTION_TYPE.STOP) {
							return this.props.value.actions[0].stop || null;
						}
				  })
				: NEW_FILTER_RULE
		});
	}

	render({ value, matchesScreenMd }, { uncommittedValue, error, isDrawerMounted }) {
		const [ComponentClass, componentClassProps] = matchesScreenMd
			? [InlineModalDialog, { autofocusChildIndex: 1 }]
			: [
					ModalDrawer,
					{
						mounted: isDrawerMounted,
						toolbar: (
							<ModalDrawerToolbar
								buttons={[
									<Button styleType="primary" brand="primary" onClick={this.handleSave}>
										<Text id="buttons.save" />
									</Button>
								]}
								onClose={this.handleCloseDrawer}
							/>
						),
						contentClass: style.filterModalInner,
						onClickOutside: this.handleClose
					}
			  ];
		return (
			<ComponentClass
				{...componentClassProps}
				dialogClassName={style.settings}
				wrapperClassName={style.filterModalWrapper}
				innerClassName={style.filterModalInner}
				actionLabel="settings.filterRuleModal.saveLabel"
				title={
					matchesScreenMd &&
					(value ? 'settings.filterRuleModal.title' : 'settings.filterRuleModal.addTitle')
				}
				onAction={this.handleSave}
				onClose={this.handleClose}
				error={error}
			>
				<FilterModalContent
					value={uncommittedValue}
					onChange={this.handleChange}
					matchesScreenMd={matchesScreenMd}
					title={value ? 'settings.filterRuleModal.title' : 'settings.filterRuleModal.addTitle'}
				/>
			</ComponentClass>
		);
	}
}
