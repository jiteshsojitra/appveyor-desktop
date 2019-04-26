import { h, Component } from 'preact';
import { Button, Icon } from '@zimbra/blocks';
import { withText } from 'preact-i18n';
import style from './style';

@withText({
	previousLabel: 'buttons.previous',
	nextLabel: 'buttons.next',
	zoomOutLabel: 'buttons.zoomOut',
	zoomInLabel: 'buttons.zoomIn'
})
export default class AttachmentViewerControls extends Component {
	render({
		onPreviousAttachment,
		onNextAttachment,
		onZoomIn,
		onZoomOut,
		previousLabel,
		nextLabel,
		zoomOutLabel,
		zoomInLabel
	}) {
		return (
			<div class={style.controls}>
				<Button aria-label={previousLabel} onClick={onPreviousAttachment}>
					<Icon size="sm" name="chevron-left" />
				</Button>
				<Button aria-label={zoomOutLabel} onClick={onZoomOut}>
					<Icon size="sm" name="search-minus" />
				</Button>
				<Button aria-label={zoomInLabel} onClick={onZoomIn}>
					<Icon size="sm" name="search-plus" />
				</Button>
				<Button aria-label={nextLabel} onClick={onNextAttachment}>
					<Icon size="sm" name="chevron-right" />
				</Button>
			</div>
		);
	}
}
