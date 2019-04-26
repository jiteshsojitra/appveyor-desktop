import { h } from 'preact';
import { Text } from 'preact-i18n';
import { Icon } from '@zimbra/blocks';
import s from './style.less';
import cx from 'classnames';

const SidebarPrimaryButton = ({ onClick, textId, hyperlinkStyle }) => (
	<button className={cx(s.button, hyperlinkStyle && s.buttonLink)} onClick={onClick}>
		{hyperlinkStyle && <Icon name="chevron-left" className={s.icon} />}
		<Text id={textId} />
	</button>
);

export default SidebarPrimaryButton;
