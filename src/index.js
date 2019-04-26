import 'regenerator-runtime/runtime';
import '@zimbra/polyfill';
import 'core-js/fn/array/from';
import 'core-js/fn/string/starts-with';
import 'core-js/es6/set';
import 'core-js/es6/map';
import 'core-js/es6/symbol';
import 'core-js/es6/weak-map';
import './style/index.less';
import { h, render } from 'preact';
import forceHTTPS from './lib/force-https';
import 'preact/devtools';
import { autoInsulate } from './lib/error-boundary';

autoInsulate({
	insulate: true,
	ignoreStateless: true
});

if (module.hot) {
	require('preact/devtools');
	module.hot.accept('./components/app', () => requestAnimationFrame(init));
}

forceHTTPS();

if (navigator.maxTouchPoints > 0) {
	document.documentElement.className = 'touch';
}

let root = document.getElementById('zm-x-web');
function init() {
	const app = require('./components/app');
	root = render(h(app.default || app), document.body, root);
}
init();
