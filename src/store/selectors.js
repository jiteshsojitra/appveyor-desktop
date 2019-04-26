import { pathToSliceName } from '../lib/util';

const context = require.context('.', true, /[^.]\/selectors\.js$/);
const exports = {};

context.keys().forEach(key => {
	exports[pathToSliceName(key)] = context(key);
});

export default exports;
