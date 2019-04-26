import { h } from 'preact';

import ToolbarSVGActionButton from '../../../toolbar/svg-action-button';

import cx from 'classnames';
import s from './style.less';

export default function PlusSignMenuToolbar({ onClose }) {
	return (
		<div class={cx(s.toolbar, s.hideMdUp)}>
			<div class={s.closeIconContainer}>
				<ToolbarSVGActionButton onClick={onClose} iconClass="close" />
			</div>
		</div>
	);
}
