import { h } from 'preact';
import { Popover } from '@zimbra/blocks';
import { Localizer } from 'preact-i18n';
import cx from 'classnames';
import styles from './style';

export default function CollapsedSubmenu(props) {
	return (
		<Localizer>
			<Popover
				{...props}
				class={cx(styles.submenuWrapper, props.class)}
				toggleClass={cx(styles.toggle, styles.toolbarButton, props.toggleClass)}
				popoverClass={cx(styles.collapsedSubmenuPopover, props.popoverClass)}
			/>
		</Localizer>
	);
}
