import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const FormGroup = ({ compact, large, separator, rows, ...rest }) => (
	<div
		{...rest}
		class={cx(
			s.formGroup,
			compact && s.compact,
			large && s.large,
			rows && s.rows,
			separator && s.separator,
			rest.class
		)}
	/>
);

export default FormGroup;
