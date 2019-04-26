import { h, Component } from 'preact';
import { Text } from 'preact-i18n';

import { ToolbarContainer as Toolbar } from '../toolbar';
import ToolbarTitle from '../toolbar/title';
import CloseButton from '../close-button';
import BackArrow from '../back-arrow';
import { callWith } from '../../lib/util';
import withMediaQuery from '../../enhancers/with-media-query/index';
import { minWidth, screenSm } from '../../constants/breakpoints';

import { Button } from '@zimbra/blocks';

import s from './style';

@withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
export default class SettingsToolbar extends Component {
	render({ onClickSave, onClickCancel, onOpenItem, matchesScreenSm, activeId, ...props }) {
		// Always show save/cancel buttons on Tablet, show them on Phone only when
		// activeId is set
		const showSaveCancel = matchesScreenSm || activeId;

		// Show the back arrow only on Phone when a menu is active
		const showBackArrow = !matchesScreenSm && activeId;

		return (
			<Toolbar class={props.class}>
				<div class={s.container}>
					<div class={s.leftContainer}>
						{showBackArrow ? (
							<BackArrow onClick={callWith(onOpenItem, null)} />
						) : (
							<ToolbarTitle text="settings.modal.title" />
						)}
					</div>
					<div class={s.rightContainer}>
						{showSaveCancel ? (
							[
								<Button styleType="primary" brand="primary" onClick={onClickSave}>
									<Text id="buttons.save" />
								</Button>,
								<Button onClick={onClickCancel}>
									<Text id="buttons.cancel" />
								</Button>
							]
						) : (
							<CloseButton onClick={callWith(onClickCancel)} />
						)}
					</div>
				</div>
			</Toolbar>
		);
	}
}
