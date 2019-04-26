import { PHOTOS, FILES, GIFS } from '../../../../store/media-menu/constants';
import { generateCommand } from './utils';
import { COMMAND_TYPE } from './constants';

export const MY_COMPUTER = 'my_computer';
export const ATTACHMENT_OPTIONS = [
	{
		label: 'attachments.my_computer',
		value: MY_COMPUTER
	},
	{
		label: 'attachments.photos',
		value: PHOTOS
	},
	{
		label: 'attachments.files',
		value: FILES
	},
	{
		label: 'attachments.gifs',
		value: GIFS
	}
];

export function generateAttachmentMenu(config = {}) {
	// if we don't have a giphy api key, remove gif from the options
	const options = config.giphyKey ? ATTACHMENT_OPTIONS : ATTACHMENT_OPTIONS.slice(0, -1);
	return generateCommand('paperclip', null, COMMAND_TYPE.MENU, {
		title: 'attachmentsTitle',
		submenu: [
			{
				menuItems: options.map(({ label, value }) =>
					generateCommand(null, null, COMMAND_TYPE.ATTACHMENT, {
						label,
						value
					})
				)
			}
		]
	});
}
