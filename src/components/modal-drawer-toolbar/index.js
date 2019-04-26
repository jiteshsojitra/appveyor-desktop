import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { ToolbarContainer as Toolbar } from '../toolbar';
import ToolbarTitle from '../toolbar/title';
import withMediaQuery from '../../enhancers/with-media-query/index';
import { minWidth, screenSm } from '../../constants/breakpoints';
import { Button } from '@zimbra/blocks';
import s from './style';

@withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
export default class ModalDrawerToolbar extends Component {
	render({
		cancelButton = true,
		title,
		buttons,
		actionLabel,
		cancelLabel,
		onAction,
		onClose,
		pending,
		disablePrimary,
		matchesScreenSm,
		...props
	}) {
		return (
			<Toolbar class={props.class}>
				<div class={s.container}>
					<div class={s.leftContainer}>{title && <ToolbarTitle text={title} />}</div>
					<div class={s.rightContainer}>
						{buttons !== false &&
							(buttons || (
								<Button
									styleType="primary"
									brand="primary"
									onClick={onAction}
									disabled={pending || disablePrimary}
								>
									<Text id={actionLabel}>{actionLabel}</Text>
								</Button>
							))}

						{cancelButton !== false && (
							<Button onClick={onClose}>
								<Text id={cancelLabel || (buttons && buttons.cancel) || 'buttons.cancel'}>
									{cancelLabel}
								</Text>
							</Button>
						)}
					</div>
				</div>
			</Toolbar>
		);
	}
}
