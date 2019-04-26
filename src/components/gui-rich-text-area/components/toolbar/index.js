import { h } from 'preact';
import { Text } from 'preact-i18n';
import { MediaMenuButton } from '../../../media-menu';
import { ContainerSize } from '@zimbra/blocks';
import { configure } from '../../../../config';
import PureComponent from '../../../../lib/pure-component';
import { TEXT_MODE } from '../../../../constants/composer';
import ZimletSlot from '../../../zimlet-slot';

import get from 'lodash-es/get';
import cx from 'classnames';
import styles from './style';

import { MY_COMPUTER, generateAttachmentMenu } from './attachment-menu-options';
import { INSERT_LINK, generateInsertLinkMenu } from './link-menu-options';
import { /*ToggleTextModeButton,*/ TrashButton, SendButton } from './buttons';
import SavedAt from './labels';
import { generateCommand } from './utils';
import { TABS as MEDIA_MENU_TABS } from '../../../../store/media-menu/constants';

import { generateFontMenu } from './font-menu-options';
import { generateColorMenu } from './color-menu-options';

import linkref from 'linkref';
import CollapsedSubmenu from './collapsed-submenu';
import { SplitPaneMenu } from './split-pane-menu';
import { SelectMenu } from './select-menu';
import { CommandButton } from './command-button';
import { EmojiMenu } from './emoji';
import { BitmojiMenu } from './bitmoji';
import { COMMAND_TYPE } from './constants';

@configure('giphyKey,snapchatApp')
export default class Toolbar extends PureComponent {
	commands = [
		generateAttachmentMenu(this.props),
		generateFontMenu(),
		generateCommand('bold', 'bold', COMMAND_TYPE.TOGGLE, { watch: true, title: 'titleBold' }),
		generateCommand('italic', 'italic', COMMAND_TYPE.TOGGLE, { watch: true, title: 'titleItalic' }),
		generateCommand('underline', 'underline', COMMAND_TYPE.TOGGLE, {
			watch: true,
			title: 'titleUnderline'
		}),
		generateColorMenu(),
		generateCommand('list-ul', null, COMMAND_TYPE.MENU, {
			title: 'listsTitle',
			submenu: [
				{
					iconMenu: true,
					menuItems: [
						generateCommand(null, 'insertunorderedlist', COMMAND_TYPE.TOGGLE, {
							icon: 'list-ul'
						}),
						generateCommand(null, 'insertorderedlist', COMMAND_TYPE.TOGGLE, {
							icon: 'list-ol'
						})
					]
				}
			]
		}),
		generateCommand('indent ', null, COMMAND_TYPE.MENU, {
			title: 'indentationTitle',
			submenu: [
				{
					iconMenu: true,
					menuItems: [
						generateCommand(null, 'indent', COMMAND_TYPE.NORMAL, {
							icon: 'indent'
						}),
						generateCommand(null, 'outdent', COMMAND_TYPE.NORMAL, {
							icon: 'outdent'
						})
					]
				}
			]
		}),
		generateCommand('align-left ', null, 'menu', {
			title: 'alignmentTitle',
			submenu: [
				{
					iconMenu: true,
					menuItems: [
						generateCommand(null, 'justifyLeft', COMMAND_TYPE.NORMAL, {
							icon: 'align-left',
							value: true
						}),
						generateCommand(null, 'justifyCenter', COMMAND_TYPE.NORMAL, {
							icon: 'align-center',
							value: true
						}),
						generateCommand(null, 'justifyRight', COMMAND_TYPE.NORMAL, {
							icon: 'align-right',
							value: true
						})
					]
				}
			]
		}),
		generateInsertLinkMenu()
	];

	// The number of buttons in the "middle" element
	numCommands = this.commands.length + 3;

	handleAttachmentOptionSelection = value => {
		if (this.props.isOffline) {
			return;
		}
		if (value === MY_COMPUTER) {
			this.props.onChooseAttachment && this.props.onChooseAttachment();
		} else {
			this.props.onOpenTab && this.props.onOpenTab(MEDIA_MENU_TABS.indexOf(value));
		}
	};

	handleBeforeResize = () => {
		const middle = get(this.refs, 'middle'),
			children = middle && middle.childNodes;

		if (!children) {
			return;
		}

		//get number of commands.  First <span> wraps many of them, so break those out individually
		let commands = [].slice.call(children);
		const spanChildren = commands.shift().childNodes;
		commands = commands.concat([].slice.call(spanChildren));

		// If children are not equal width, there can be flashing when expanding.
		const width = middle.offsetWidth,
			avgChildWidth =
				commands.reduce((acc, { offsetWidth }) => acc + (offsetWidth || 0), 0) / commands.length,
			canShowNumCommands = Math.floor(width / avgChildWidth),
			collapsed = canShowNumCommands < this.numCommands;

		this.state.collapsed !== collapsed && this.setState({ collapsed });
	};

	execCommand = ({ command, type, value }) => {
		const { exec } = this.props;
		if (type === COMMAND_TYPE.ATTACHMENT) {
			this.handleAttachmentOptionSelection(value);
		} else if (type === COMMAND_TYPE.LINK) {
			if (value === INSERT_LINK) {
				return this.props.showLinkEditorDialog();
			}
		} else if (type === COMMAND_TYPE.TOGGLE) {
			value = !exec('queryCommandState', command);
		} else if (!value && type === COMMAND_TYPE.NORMAL) {
			value = true;
		}
		exec('execCommand', command, false, value);
	};

	static defaultProps = {
		collapseRange: [1, 9]
	};

	componentDidMount() {
		this.timer = setInterval(() => this.setState({}), 1000);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}

	renderCommand = ({ command, icon, label, type, submenu, title, style, watch, ...props }) => {
		const isOffline = this.props.isOffline;
		return submenu ? (
			submenu.length > 1 ? (
				<SplitPaneMenu
					commandState={this.props.commandState}
					onChange={this.execCommand}
					menuIcon={icon}
					submenu={submenu}
					title={title}
				/>
			) : (
				<SelectMenu
					onChange={this.execCommand}
					menuIcon={icon}
					submenu={submenu[0]}
					title={title}
					isOffline={isOffline}
				/>
			)
		) : (
			<CommandButton
				command={command}
				commandType={type}
				icon={icon}
				class={props.class}
				title={title}
				label={label}
				commandState={this.props.commandState}
				execCommand={this.execCommand}
			/>
		);
	};
	render(
		{
			overlay,
			mode,
			loading,
			disabled,
			messageLastSaved,
			onSend,
			onDelete,
			onToggleTextMode,
			onToggleMediaMenu,
			onEmojiSelect,
			onBitmojiSelect,
			collapseRange = [],
			snapchatApp,
			isOffline,
			...props
		},
		{ collapsed }
	) {
		delete props.commandState;
		const isPlainText = mode === TEXT_MODE;
		return (
			<div {...props} class={cx(styles.container, props.class)}>
				<ContainerSize width={false} height={false} onBeforeResize={this.handleBeforeResize}>
					<div class={styles.toolbar}>
						<div class={styles.left}>
							<SendButton onClick={onSend} disabled={disabled} loading={loading} />
							<div class={styles.middle} ref={linkref(this, 'middle')}>
								<ZimletSlot name="richtextarea-toolbar" isPlainText={isPlainText}>
									{zimletResponses => (
										<span>
											{zimletResponses}
											{isPlainText
												? this.renderCommand(this.commands[0])
												: collapsed
												? [
														...this.commands.slice(0, collapseRange[0]).map(this.renderCommand),
														<CollapsedSubmenu
															text="A̲"
															tooltip={<Text id={`compose.toolbar.collapsedTitle`} />}
														>
															{this.commands
																.slice(collapseRange[0], collapseRange[1])
																.map(this.renderCommand)}
														</CollapsedSubmenu>,
														...this.commands.slice(collapseRange[1]).map(this.renderCommand)
												  ]
												: this.commands.map(this.renderCommand)}
										</span>
									)}
								</ZimletSlot>
								{!isPlainText && <EmojiMenu onEmojiSelect={onEmojiSelect} />}
								{!isPlainText && snapchatApp && <BitmojiMenu onBitmojiSelect={onBitmojiSelect} />}
								{/*<ToggleTextModeButton isPlainText={isPlainText} onClick={onToggleTextMode} />*/}
								<TrashButton onClick={onDelete} />
							</div>
							<SavedAt date={messageLastSaved} />
						</div>
						{!isPlainText && (
							<div class={styles.right}>
								<MediaMenuButton onClick={onToggleMediaMenu} isOffline={isOffline} />
							</div>
						)}
					</div>
				</ContainerSize>
				{overlay}
			</div>
		);
	}
}
