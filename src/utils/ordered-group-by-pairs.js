import sortedUniqBy from 'lodash-es/sortedUniqBy';
import groupBy from 'lodash-es/groupBy';

export default function orderedGroupByPairs(array, iteratee) {
	const sortedKeys = sortedUniqBy(array, iteratee).map(iteratee);
	const groups = groupBy(array, iteratee);
	return sortedKeys.map(k => [k, groups[k]]);
}
