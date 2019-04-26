import { circularIndex, ensureWithinRange } from './util';

/**
 * A structure used for converting between a one dimensional index
 * and a two dimensional point. A grid can be emulated by transforming an index
 * and any boundaries into a 2D coordinate system.
 *
 * Example of a 3x3 grid:
 * [ 0, 1, 2,       [ (0, 0), (0, 1), (0, 2),
 *   3, 4, 5,  <==>   (1, 0), (1, 1), (1, 2),
 *   6, 7, 8 ]        (2, 0), (2, 1), (2, 2) ]
 */
export default function createLogicalGrid(numRows, numCols, { wrap, wrapRows, wrapCols } = {}) {
	const exports = {};

	exports.numRows = numRows;
	exports.numCols = numCols;

	/**
	 * Given a point, return the index associated with that point after it has
	 * been moved in bounds.
	 * @param {Number[]}   a point in the form [ row, col ]
	 * @returns {Number}   an index
	 */
	exports.getIndex = function getIndex(point) {
		const [row, col] = exports.moveInbounds(point);
		return row * numCols + col;
	};

	/**
	 * Given an index in an Array, return a point within bounds of the grid
	 * @returns {Number[]}
	 */
	exports.getPoint = function getPoint(index) {
		return exports.moveInbounds([Math.floor(index / numCols), index % numCols]);
	};

	/**
	 * Given a point, return a point that is moved to be within the boundaries
	 * @param {Number[]}           a point
	 * @returns {Number[]}         a shifted point if it was out of bounds, or the same point otherwise
	 */
	exports.moveInbounds = function moveInbounds([row, col]) {
		return [
			wrapRows || (wrap && wrapRows !== false)
				? circularIndex(row, numRows)
				: ensureWithinRange(0, numRows - 1, row),
			wrapCols || (wrap && wrapCols !== false)
				? circularIndex(col, numCols)
				: ensureWithinRange(0, numCols - 1, col)
		];
	};

	return exports;
}
