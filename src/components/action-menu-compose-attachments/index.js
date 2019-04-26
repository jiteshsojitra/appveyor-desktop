import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { callWith } from '../../lib/util';
import { configure } from '../../config';
import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';

import { PHOTOS, FILES, GIFS, TABS } from '../../store/media-menu/constants';

@configure('giphyKey')
export default class ActionMenuComposeAttachments extends Component {
	render({
		onOpenMediaMenu,
		onChooseAttachment,
		actionButtonClass,
		popoverClass,
		iconClass,
		arrow,
		monotone,
		iconOnly,
		giphyKey,
		isOffline
	}) {
		return (
			<ActionMenu
				actionButtonClass={actionButtonClass}
				icon="paperclip"
				iconClass={iconClass}
				iconOnly={iconOnly}
				monotone={monotone}
				arrow={arrow}
				popoverClass={popoverClass}
				disabled={isOffline}
			>
				<DropDownWrapper>
					<ActionMenuGroup>
						{
							<ActionMenuItem onClick={onChooseAttachment}>
								<Text id="compose.toolbar.attachments.my_device" />
							</ActionMenuItem>
						}
						{
							<ActionMenuItem onClick={callWith(onOpenMediaMenu, TABS.indexOf(PHOTOS))}>
								<Text id="compose.toolbar.attachments.photos" />
							</ActionMenuItem>
						}
						{
							<ActionMenuItem onClick={callWith(onOpenMediaMenu, TABS.indexOf(FILES))}>
								<Text id="compose.toolbar.attachments.files" />
							</ActionMenuItem>
						}
						{giphyKey && (
							<ActionMenuItem onClick={callWith(onOpenMediaMenu, TABS.indexOf(GIFS))}>
								<Text id="compose.toolbar.attachments.gifs" />
							</ActionMenuItem>
						)}
					</ActionMenuGroup>
				</DropDownWrapper>
			</ActionMenu>
		);
	}
}
