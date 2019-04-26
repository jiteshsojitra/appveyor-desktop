import { h } from 'preact';
import style from './style';
import { callWith } from '../../lib/util';

const Breadcrumb = ({ items, switchView }) => (
	<ul class={style.breadcrumb}>
		{items.map((item, index, arr) =>
			index === arr.length - 1 ? (
				<li>{item.display.toString()}</li>
			) : (
				<li>
					<a onClick={callWith(switchView, [item.value])}>{item.display.toString()}</a>
				</li>
			)
		)}
	</ul>
);

export default Breadcrumb;
