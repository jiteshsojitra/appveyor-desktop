import has from 'lodash-es/has';
import forOwn from 'lodash-es/forOwn';
import isNull from 'lodash-es/isNull';
import cloneDeep from 'lodash-es/cloneDeep';
import isArray from 'lodash-es/isArray';
import pull from 'lodash-es/pull';
import values from 'lodash-es/values';
import isObject from 'lodash-es/isObject';
import isEmpty from 'lodash-es/isEmpty';
import { FILTER_ACTION_TYPE, FILTER_TEST_TYPE } from '../constants/filter-rules';

export function isFilterSupported(rule) {
	if (!rule.active) return false;

	// We only support single-action rules.
	if (rule.actions.length > 1) return false;
	const filterAction = rule.actions[0];

	if (!has(filterAction, FILTER_ACTION_TYPE.FILE_INTO)) {
		return false;
	} else if (has(filterAction, FILTER_ACTION_TYPE.STOP) && Object.keys(filterAction).length > 2) {
		return false;
	}

	// We only support a subset of test types.
	// TODO: we could be stricter on filtering, e.g. for these test types there
	// might exist unsupported header tests set by legacy client.
	const condition = rule.conditions[0];

	const testConditions = values(FILTER_TEST_TYPE);
	return Object.keys(condition).every(key => {
		// We are not supporting anyOf condition
		if (key === 'allOrAny') {
			return condition[key] !== 'anyof';
		}

		return testConditions.indexOf(key) > -1;
	});
}

export function pruneEmpty(obj) {
	return (function prune(current) {
		forOwn(current, (value, key) => {
			if (isNull(value) || (isObject(value) && isEmpty(prune(value)))) {
				delete current[key];
			}
		});

		// remove any leftover undefined values from the delete
		// operation on an array
		if (isArray(current)) {
			pull(current, undefined);
		}

		return current;
	})(cloneDeep(obj)); // Do not modify the original object, create a clone instead
}
