import { h } from 'preact';
import { ContainerSize } from '@zimbra/blocks';
import PureComponent from '../../../../lib/pure-component';

import get from 'lodash-es/get';
import cx from 'classnames';
import styles from './style';

import { MY_COMPUTER } from './attachment-menu-options';
import { INSERT_LINK, generateInsertLinkMenu } from './link-menu-options';
import { TrashButton } from './buttons';
import SavedAt from './labels';
import { generateCommand } from './utils';

import { generateFontMenu } from './font-menu-options';
import { generateColorMenu } from './color-menu-options';

import linkref from 'linkref';
import { SplitPaneMenu } from './split-pane-menu';
import { SelectMenu } from './select-menu';
import { CommandButton } from './command-button';
import { COMMAND_TYPE } from './constants';

export default class SimpleToolbar extends PureComponent {
	commands = [
		generateFontMenu(),
		generateCommand('bold', 'bold', COMMAND_TYPE.TOGGLE, {
			watch: true,
			title: 'titleBold'
		}),
		generateCommand('italic', 'italic', COMMAND_TYPE.TOGGLE, {
			watch: true,
			title: 'titleItalic'
		}),
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
		if (value === MY_COMPUTER) {
			this.props.onChooseAttachment && this.props.onChooseAttachment();
		}
	};

	handleBeforeResize = () => {
		const middle = get(this.refs, 'middle'),
			children = middle && middle.childNodes;

		if (!children) {
			return;
		}

		// If children are not equal width, there can be flashing when expanding.
		const width = middle.offsetWidth,
			commands = [].slice.call(children),
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

	componentDidMount() {
		this.timer = setInterval(() => this.setState({}), 1000);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}

	renderCommand = ({ command, icon, label, type, submenu, title, style, watch, ...props }) =>
		submenu ? (
			submenu.length > 1 ? (
				<SplitPaneMenu
					onChange={this.execCommand}
					menuIcon={icon}
					submenu={submenu}
					commandState={this.props.commandState}
					title={title}
				/>
			) : (
				<SelectMenu
					onChange={this.execCommand}
					menuIcon={icon}
					submenu={submenu[0]}
					title={title}
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

	render({
		overlay,
		isSendInProgress,
		messageLastSaved,
		onSend,
		onDelete,
		onToggleTextMode,
		...props
	}) {
		delete props.commandState;

		return (
			<div {...props} class={cx(styles.container, props.class)}>
				<ContainerSize width={false} height={false} onBeforeResize={this.handleBeforeResize}>
					<div class={cx(styles.toolbar, styles.simpleToolbar)}>
						<div class={styles.left}>
							<div class={styles.middle} ref={linkref(this, 'middle')}>
								{this.commands.map(this.renderCommand)}
								<TrashButton onClick={onDelete} />
							</div>
							<SavedAt date={messageLastSaved} />
						</div>
					</div>
				</ContainerSize>
				{overlay}
			</div>
		);
	}
}
