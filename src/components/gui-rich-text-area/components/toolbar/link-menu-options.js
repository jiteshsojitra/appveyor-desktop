import { generateCommand } from './utils';
import { COMMAND_TYPE } from './constants';

export const INSERT_LINK = 'link';
export const INSERT_LINK_OPTIONS = [
	{
		label: 'links.insertLink',
		value: INSERT_LINK
	}
];

export function generateInsertLinkMenu() {
	return generateCommand('link', null, COMMAND_TYPE.MENU, {
		title: 'titleLink',
		submenu: [
			{
				menuItems: INSERT_LINK_OPTIONS.map(({ label, value }) =>
					generateCommand(null, null, COMMAND_TYPE.LINK, {
						label,
						value
					})
				)
			}
		]
	});
}
