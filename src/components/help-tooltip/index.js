import { h } from 'preact';
import { callWith } from '../../lib/util';
import CloseButton from '../close-button';
import { Tooltip, ClickOutsideDetector, Icon } from '@zimbra/blocks';
import style from './style.less';
import cx from 'classnames';

export default function HelpTooltip({
	visible,
	name,
	toggleTooltip,
	dismiss,
	children,
	position = 'left',
	customStyle
}) {
	return (
		<ClickOutsideDetector onClickOutside={visible && dismiss}>
			<div class={style.tooltipContainer}>
				<button onClick={callWith(toggleTooltip, name)}>
					<Icon size="sm" name="question-circle" />
				</button>
				{visible && (
					<Tooltip position={position} class={cx(style.tooltip, customStyle)}>
						{children}
						<CloseButton onClick={dismiss} class={style.close} />
					</Tooltip>
				)}
			</div>
		</ClickOutsideDetector>
	);
}
