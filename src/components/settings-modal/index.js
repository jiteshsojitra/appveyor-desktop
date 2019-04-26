import { h } from 'preact';
import Portal from 'preact-portal';
import split from '../../lib/split-point';
import { Spinner } from '@zimbra/blocks';
import style from './loading.less';

export default split(
	import(/* webpackMode: "lazy", webpackChunkName: "settings" */ './settings-modal'),
	'settings',
	<Portal into="body">
		<div class={style.loading}>
			<Spinner block class={style.spinner} />
		</div>
	</Portal>
);
