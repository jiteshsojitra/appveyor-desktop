import { h } from 'preact';
import { Text } from 'preact-i18n';
import flatMap from 'lodash-es/flatMap';
import { FILTER_TEST_TYPE } from '../../../constants/filter-rules';

import style from '../style';

function formatTestPredicate(stringComparison, negative) {
	return <Text id={`settings.filterRules.${stringComparison}${negative ? 'Not' : ''}`} />;
}

function formatTestHeader(header) {
	if (header === 'to,cc') return <Text id="settings.filterRules.tocc" />;
	return header.charAt(0).toUpperCase() + header.slice(1);
}

/**
 * Creates human-readable displays of filter rule test conditions.
 *
 */
export default function FilterRuleTests({ test }) {
	return (
		<ul class={style.filterRuleTestsList}>
			{flatMap(Object.keys(test), filterTestKey => {
				if (FILTER_TEST_TYPE.BODY === filterTestKey) {
					return test[filterTestKey].map(({ value, negative, caseSensitive }) => {
						const pred = formatTestPredicate('contains', negative);
						const part = <Text id="settings.filterRules.body" />;
						const matchCase = caseSensitive && <Text id="settings.filterRules.matchCase" />;
						return (
							<li>
								{part} {pred} "<b>{value}</b>" {matchCase}
							</li>
						);
					});
				}

				if (
					FILTER_TEST_TYPE.ADDRESS === filterTestKey ||
					FILTER_TEST_TYPE.HEADER === filterTestKey
				) {
					return test[filterTestKey].map(
						({ header, value, stringComparison, negative, caseSensitive }) => {
							const pred = formatTestPredicate(stringComparison, negative);
							const part = formatTestHeader(header);
							const matchCase = caseSensitive && <Text id="settings.filterRules.matchCase" />;
							return (
								<li>
									{part} {pred} "<b>{value}</b>" {matchCase}
								</li>
							);
						}
					);
				}
			})}
		</ul>
	);
}
