import { COMMAND_TYPE } from './constants';
import { generateCommand } from './utils';
import cx from 'classnames';
import styles from './style';

export const COLORS = [
	'#000000',
	'#888888',
	'#ffffff',
	'#9f1606',
	'#ce0000',
	'#e26563',
	'#b65f00',
	'#e8922a',
	'#e5ad5e',
	'#c09100',
	'#ffc900',
	'#fdfa5c',
	'#367714',
	'#68a94a',
	'#92c57a',
	'#025196',
	'#6da7de',
	'#9ec4ea',
	'#351777',
	'#674ba9',
	'#8e7ac5',
	'#751847',
	'#a84b79',
	'#c37aa0'
];

const HILIGHT_SUPPORTED = document.queryCommandSupported('hilitecolor');

export function generateColorMenu() {
	return generateCommand('adn', null, COMMAND_TYPE.MENU, {
		watch: true,
		title: 'colorTitle',
		submenu: [
			{
				heading: 'headingText',
				command: 'forecolor',
				class: styles.colorMenu,
				menuItems: COLORS.map(color =>
					generateCommand(null, 'forecolor', COMMAND_TYPE.COLOR, {
						class: cx(styles.colorMenuItem, color === '#ffffff' && styles.colorMenuItemWhite),
						value: color,
						style: `background:${color};`
					})
				)
			},
			...(!HILIGHT_SUPPORTED
				? []
				: [
						{
							heading: 'headingHighlight',
							command: 'hilitecolor',
							class: styles.colorMenu,
							menuItems: COLORS.map(color =>
								generateCommand(null, 'hilitecolor', COMMAND_TYPE.COLOR, {
									class: cx(
										styles.colorMenuItem,
										color === '#ffffff' && styles.colorMenuItemTransparent
									),
									value: color === '#ffffff' ? 'transparent' : color,
									style: `background:${color === '#ffffff' ? 'transparent' : color};`
								})
							)
						}
				  ])
		]
	});
}
