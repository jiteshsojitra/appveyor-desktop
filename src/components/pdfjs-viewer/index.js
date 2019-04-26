import split from '../../lib/split-point';

export default split(
	import(/* webpackMode: "lazy", webpackChunkName: "pdfjs-viewer" */ './pdfjs-viewer')
);
