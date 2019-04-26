import { pruneEmpty } from '../../utils/filter';
import omitDeep from 'omit-deep';

export function cloneWithoutTypeName(obj) {
	return omitDeep(pruneEmpty(obj), '__typename');
}

/**
 * Recursively build a graphql selection set from an object.
 * Dereferences pointers used by the apollo-cache.
 */
export function selectionSetFromObject(cache, obj) {
	return Object.keys(obj).reduce((selectionSet, key) => {
		if (obj[key] === null) {
			// Exclude null keys
			return selectionSet;
		}
		selectionSet += key;

		if (obj[key] && typeof obj[key] === 'object') {
			let nextObj = Array.isArray(obj[key]) ? obj[key][0] : obj[key];
			if (nextObj) {
				if (nextObj.generated === true && nextObj.type === 'id') {
					// dereference pointers to other cache objs
					nextObj = cache.data.data[nextObj.id];
				}

				selectionSet += ` {\n${selectionSetFromObject(cache, nextObj)}}`;
			}
		}
		selectionSet += '\n';
		return selectionSet;
	}, '');
}
