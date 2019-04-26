import { h } from 'preact';
import split from '../../lib/split-point';
import { Spinner } from '@zimbra/blocks';
import style from './loading.less';

export default split(
	import(/* webpackMode: "lazy", webpackChunkName: "composer" */ './composer'),
	'composer',
	<div class={style.loading}>
		<Spinner block class={style.spinner} />
	</div>
);
