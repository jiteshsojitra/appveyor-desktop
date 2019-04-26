import style from './style';
import { COMMAND_TYPE } from './constants';
import { generateCommand } from './utils';
import { FONT_FAMILY, FONT_SIZE } from '../../../../constants/fonts';

export function generateFontMenu() {
	return generateCommand('font', null, COMMAND_TYPE.MENU, {
		watch: true,
		title: 'fontsTitle',
		submenu: [
			{
				command: 'fontName',
				menuItems: FONT_FAMILY.map(({ label, value }) =>
					generateCommand(null, 'fontName', COMMAND_TYPE.NORMAL, {
						label,
						value,
						style: `font-family:${value}; font-size:13px;`
					})
				)
			},
			{
				command: 'fontSize',
				menuItems: FONT_SIZE.map(({ label, value }) =>
					generateCommand(null, 'fontSize', COMMAND_TYPE.NORMAL, {
						label,
						value,
						class: style[`fontSize${value}`],
						style: `line-height:1.5;`
					})
				)
			}
		]
	});
}
