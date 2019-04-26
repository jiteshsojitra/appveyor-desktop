import { pathToSliceName } from '../lib/util';

const context = require.context('.', true, /[^.]\/actions\.js$/);
const exports = {};

context.keys().forEach(key => {
	exports[pathToSliceName(key)] = context(key);
});

export default exports;
