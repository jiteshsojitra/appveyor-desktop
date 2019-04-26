import { h } from 'preact';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import s from './style.less';

const AlignedLabel = ({ width, align = 'right', textId, children, ...rest }) => (
	<label
		{...rest}
		class={cx(s.alignedLabel, s[align], rest.class)}
		style={{
			width,
			minWidth: width
		}}
	>
		{children}
		{textId && <Text id={textId} />}
	</label>
);

AlignedLabel.defaultProps = {
	width: '110px'
};

export default AlignedLabel;
