import { h } from 'preact';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import s from './style.less';

const Label = ({ children, large, id, ...rest }) => (
	<label {...rest} class={cx(s.label, large && s.large)}>
		{id ? <Text id={id} /> : children}
	</label>
);

export default Label;
