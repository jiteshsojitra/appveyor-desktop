import { h } from 'preact';
import cx from 'classnames';

import s from './style.less';

const NakedButton = props => (
	<button {...props} class={cx(s.button, props.linkColor && s.linkColor, props.class)} />
);

export default NakedButton;
