/* eslint-disable react/no-string-refs */
import { h } from 'preact';
import PureComponent, { shallowEqual } from '../../lib/pure-component';
import { isValidURL } from '../../lib/util';
import { forceContentDisposition } from '../../utils/attachments';
import AttachmentGrid from '../attachment-grid';
import { getEmojiPropsFromShortName } from './components/toolbar/emoji';
import Toolbar from './components/toolbar';
import { EmbedScrim, AttachScrim } from './components/scrim';
import DropTargetDetector from '../drop-target-detector';
import linkref from 'linkref';
import { connect } from 'preact-redux';
import partition from 'lodash-es/partition';
import { clearDragData, setDragging } from '../../store/dragdrop/actions';
import getScrollParent from '@zimbra/util/src/get-scroll-parent';
import debounce from '@zimbra/util/src/debounce';
import { KeyCodes, AffixBottom } from '@zimbra/blocks';
import RichTextArea from './rich-text-area';
import style from './style';
import cx from 'classnames';
import * as documentCommands from '../../utils/rich-text-area';
import { WATCH_COMMAND_STATE_PROPERTIES } from '../../constants/rich-text-area';
import { findAnchorTagInSelection, replaceWordBeforeCursor } from '../../lib/html-email';
import { LinkEditorDialog } from './components/link-editor-dialog';
import MailResponseControls from '../mail-response-controls';

@connect(
	({ dragdrop }, { isOffline }) => ({
		draggingData: dragdrop.data,
		showDropTargets: !isOffline && dragdrop.isDragging
	}),
	{ clearDragData, setDragging },
	undefined,
	{ withRef: true }
)
export default class GuiRichTextArea extends PureComponent {
	currLinkId = 0;

	exec = (command, ...args) => {
		if (this.refs.rte) {
			const commandName = args[0] || '';
			this.focus();

			const execResult = documentCommands[command](...args);
			if (WATCH_COMMAND_STATE_PROPERTIES.indexOf(commandName) !== -1) this.setCommandState();
			return execResult;
		}
	};

	setCommandState = debounce(() => {
		this.setState({
			commandState: documentCommands.getCommandState()
		});
	}, 100);

	getBase = () => this.base;
	getEditorBase = () => this.refs.rte.getBase();

	getDocument() {
		return this.refs.rte.getDocument();
	}

	focus = () => {
		if (this.refs && this.refs.rte) {
			this.refs.rte.focus();
		}
	};

	readFiles(files, callback) {
		// NOTE: IF YOU CALL THIS FROM `dragover` IT WILL FAIL
		// The only event that has the security clearance to read files from the dataTransfer object are `drop` events.
		// See bullet point 3 of "the files attribute" subsection of the DataTransfer interface:
		// https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface

		let waiting = 0;
		const finished = [];
		if (typeof files !== 'undefined' && files.length > 0) {
			for (let i = 0, file; (file = files[i]); i++) {
				const reader = new FileReader();

				reader.onload = e2 => {
					const attachment = new Blob([e2.target.result], { type: file.type });
					attachment.filename = file.name;
					attachment.contentType = file.type;
					waiting--;
					finished.push(attachment);

					if (waiting === 0) {
						callback && callback(finished);
					}
				};

				waiting++;
				reader.readAsArrayBuffer(file);
			}
		}
	}

	/**
	 * Given a list of files, determine embed or attach them and how to do so
	 */
	embedOrAttach = files => {
		if (typeof files !== 'undefined' && files.length > 0) {
			const { onEmbedLinks, onEmbedFiles, onAttachFiles } = this.props;
			const [embeddable, nonembeddable] = partition(
				files,
				({ contentType }) =>
					contentType &&
					(contentType.indexOf('image/') === 0 || contentType.indexOf('text/uri-list') === 0)
			);
			const [links, images] = partition(
				embeddable,
				({ contentType }) => contentType && contentType.indexOf('text/uri-list') === 0
			);

			if (links.length > 0 && typeof onEmbedLinks !== 'undefined') {
				onEmbedLinks(links);
			}

			if (images.length > 0 && typeof onEmbedFiles !== 'undefined') {
				onEmbedFiles(images);
			}

			if (nonembeddable.length > 0 && typeof onAttachFiles !== 'undefined') {
				onAttachFiles(nonembeddable);
			}
		}
	};

	handleDropEmbed = e => {
		e.stopPropagation();
		e.preventDefault();

		const { files } = e.dataTransfer;
		const { draggingData, showDropTargets } = this.props;

		if (typeof files !== 'undefined' && files.length) {
			this.readFiles(files, this.embedOrAttach);
		} else if (typeof draggingData !== 'undefined') {
			this.embedOrAttach(draggingData);
		}

		showDropTargets && this.props.setDragging(false);
	};

	handleDropAttachment = e => {
		e.stopPropagation();
		e.preventDefault();

		const { files } = e.dataTransfer;

		if (typeof files !== 'undefined' && files.length) {
			this.readFiles(files, this.props.onAttachFiles);
		} else {
			const { draggingData } = this.props;

			if (
				typeof draggingData !== 'undefined' &&
				draggingData.length &&
				typeof this.props.onAttachFiles !== 'undefined'
			) {
				this.props.onAttachFiles(
					draggingData.map(file => forceContentDisposition(file, 'attachment'))
				);
			}
		}

		this.props.showDropTargets && this.props.setDragging(false);
	};

	handleDragOverEmbed = e => {
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'move';
	};

	handleDragOverAttachment = e => {
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'copy';
	};

	handleInput = e => {
		this.setCommandState();
		this.props.onInput && this.props.onInput(e);
	};

	handleChange = e => {
		this.setCommandState();
		this.props.onChange && this.props.onChange(e);
	};

	handleKeyUp = e => {
		this.setCommandState();
		this.props.onKeyUp && this.props.onKeyUp(e);
	};

	handleKeyDown = e => {
		if (e.keyCode === KeyCodes.CARRIAGE_RETURN || e.keyCode === KeyCodes.SPACE_BAR) {
			//call functions you want to process on each token
			replaceWordBeforeCursor(this.linkReplacePredicate, this.addLink);
			replaceWordBeforeCursor(this.emojiReplacePredicate, this.props.onEmojiSelect);

			//clear out our auto-replace prevention flag after each word boundary is handled
			delete this.preventAutoReplace;
		}

		//make sure the cursor is above the toolbar bounding recipient and scroll up if not
		if (this.refs.affixBottom) {
			setTimeout(() => {
				if (!this.base) {
					return;
				}
				const selection = window.getSelection();

				if (!selection.rangeCount) return;
				const range = selection.getRangeAt(0).cloneRange();
				let bottomOfCaret = range.getBoundingClientRect().bottom;
				if (!bottomOfCaret) {
					let span = this.endSpan;
					if (!span) {
						span = this.endSpan = document.createElement('span');
						// 0-width space gives it height
						span.textContent = '\u200b';
					}
					range.insertNode(span);
					bottomOfCaret = span.getBoundingClientRect().bottom;
					span.parentNode.removeChild(span); //remove the span when we are done
				}

				const topOfToolbar = this.refs.affixBottom.base.firstChild.getBoundingClientRect().top;
				if (bottomOfCaret > topOfToolbar) {
					const scrollParent = getScrollParent(this.base) || this.base.offsetParent;
					scrollParent.scrollTop = scrollParent.scrollTop + (bottomOfCaret - topOfToolbar) + 5;
				}
			}, 5); //wait long enough for the browser to reposition the cursor to get its correct new location
		}
	};

	handlePaste = e => {
		const clipboardData = e.clipboardData || window.clipboardData;
		const pastedData = clipboardData.getData('Text');
		if (isValidURL(pastedData)) {
			e.preventDefault();
			e.stopPropagation();
			this.addLink({ url: pastedData });
		}
	};

	findAncestorAnchorTag(tag) {
		if (tag.hasAttribute('href')) {
			return tag;
		}

		while (tag.parentNode) {
			tag = tag.parentNode;
			if (tag.tagName === 'A' && tag.hasAttribute('editor-inserted-link')) {
				return tag;
			}
		}
	}

	handleClick = e => {
		e.preventDefault();

		const anchorTagNode = this.findAncestorAnchorTag(e.target);

		if (anchorTagNode) {
			this.showLinkEditorDialog({
				url: anchorTagNode.getAttribute('href'),
				text: anchorTagNode.innerText,
				editedLink: anchorTagNode
			});
		}

		this.props.onClick && this.props.onClick(e);
	};

	// LINK TAG FUNCTIONALITY
	addOrUpdateLink = ({ url, text }) => {
		const { editedLink } = this.state;
		this.focus();

		if (editedLink) {
			this.updateLink(editedLink, { url, text });
		} else {
			this.addLink({ url, text });
		}
		this.resetLinkEditorDialog();
	};

	updateLink(anchorNode, { url, text }) {
		const selection = window.getSelection(),
			range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();

		anchorNode.setAttribute('href', url);
		anchorNode.setAttribute('data-original-text', text);
		range.selectNodeContents(anchorNode);
		const textFragment = this.createTextNode(text);
		range.deleteContents();
		range.insertNode(textFragment);
		if (!selection.rangeCount) selection.addRange(range);

		this.props.onInput && this.props.onInput({ value: this.refs.rte.getDocument().body.innerHTML });
	}

	addLink = ({ url, text }) => {
		this.currLinkId = this.currLinkId + 1;
		const anchorTag = `<a id="enhanced-link-${
			this.currLinkId
		}" editor-inserted-link target="_blank" rel="noreferrer noopener" href=${url}>${text ||
			url}</a>`;
		// enhance the link
		this.props.onAddLink({
			html: anchorTag,
			url,
			text,
			uid: this.currLinkId
		});
	};

	createTextNode(text) {
		const div = document.createElement('div');
		div.innerHTML = text;
		const fragment = document.createDocumentFragment();
		let child;
		while ((child = div.firstChild)) {
			fragment.appendChild(child);
		}
		return fragment;
	}

	getSelectedText = () => {
		const selection = window.getSelection();
		let text = '';

		if (!selection.isCollapsed && selection.rangeCount) {
			const size = selection.rangeCount;
			for (let i = 0; i < size; i++) {
				text += selection.getRangeAt(i).toString();
			}
		}
		return text;
	};

	// LINK EDITOR DIALOG
	showLinkEditorDialog = ({ url, text, editedLink } = {}) => {
		this.focus();
		if (!text) text = this.getSelectedText();
		if (!url) {
			const selection = window.getSelection();
			if (!selection.isCollapsed) {
				let node = selection.anchorNode;

				// If no URL is passed in, check to see if an anchor tag is selected.
				// If an anchor is found, use the URL from that anchor.
				while (node && node.nodeType === 3 && (node = node.parentElement)) {
					if (node.tagName === 'A') {
						url = node.href;
						break;
					}
				}
			}
		}

		this.setState({
			displayLinkEditorDialog: true,
			url,
			text,
			editedLink
		});
	};

	closeLinkEditorDialog = () => {
		this.setState({
			displayLinkEditorDialog: false
		});
	};

	resetLinkEditorDialog = () => {
		this.setState({
			url: '',
			text: '',
			editedLink: null
		});
	};
	// END: LINK EDITOR DIALOG

	emojiReplacePredicate = token => {
		const emoji = getEmojiPropsFromShortName(token);
		if (!emoji || (this.preventAutoReplace && shallowEqual(this.preventAutoReplace, emoji)))
			return false;
		return {
			emoji,
			onDelete: () => (this.preventAutoReplace = emoji)
		};
	};

	//Don't replace with an anchor tag if it isn't a url or if there is already an anchor tag in the selection
	//i.e. don't replace it twice
	linkReplacePredicate = url =>
		!isValidURL(url) || findAnchorTagInSelection(window) ? false : { url };

	footerToolbar = () => {
		const {
			draggingData,
			showDropTargets,
			loading,
			disabled,
			messageLastSaved,
			onSend,
			onDelete,
			onToggleTextMode,
			onToggleMediaMenu,
			onChooseAttachment,
			onOpenTab,
			onEmojiSelect,
			onBitmojiSelect,
			isOffline
		} = this.props;

		const { commandState } = this.state;

		return (
			<Toolbar
				onChooseAttachment={onChooseAttachment}
				onOpenTab={onOpenTab}
				loading={loading}
				disabled={disabled}
				messageLastSaved={messageLastSaved}
				onSend={onSend}
				onDelete={onDelete}
				isOffline={isOffline}
				showLinkEditorDialog={this.showLinkEditorDialog}
				overlay={
					showDropTargets &&
					(typeof draggingData === 'undefined' ||
						(draggingData.length > 0 && draggingData[0].size > 0)) && (
						<AttachScrim
							onDrop={this.handleDropAttachment}
							onDragOver={this.handleDragOverAttachment}
						/>
					)
				}
				commandState={commandState}
				onEmojiSelect={onEmojiSelect}
				onBitmojiSelect={onBitmojiSelect}
				onToggleMediaMenu={onToggleMediaMenu}
				onToggleTextMode={onToggleTextMode}
				exec={this.exec}
			/>
		);
	};

	componentWillReceiveProps({ draggingData }) {
		if (this.props.draggingData !== draggingData) {
			this.props.setDragging && this.props.setDragging(typeof draggingData !== 'undefined');
		}
	}

	render(
		{
			showDropTargets,
			onRemoveAttachment,
			attachments,
			matchesScreenMd,
			class: cl,
			style: inlineStyle,
			inline,
			uploadingFiles,
			replyType,
			onTogglePreviousMail,
			onSelectPreviousMessageSetting,
			previousMessageSetting,
			expandPrevMail,
			showPreviousMailControls,
			...props
		},
		{ displayLinkEditorDialog, url, text }
	) {
		delete props.onEmbedLinks;
		delete props.onEmbedFiles;
		delete props.onAttachFiles;

		return (
			<div class={cx('gui-richtextarea', cl)} style={inlineStyle}>
				<DropTargetDetector />
				<div class={style.relative}>
					<RichTextArea
						{...props}
						ref={linkref(this, 'rte')}
						onClick={this.handleClick}
						onMouseUp={this.setCommandState}
						onKeyUp={this.handleKeyUp}
						onKeyDown={this.handleKeyDown}
						onInput={this.handleInput}
						onPaste={this.handlePaste}
						onChange={this.handleChange}
					/>

					{showPreviousMailControls && (replyType === 'r' || replyType === 'w') && (
						<MailResponseControls
							onSelectPreviousMessageSetting={onSelectPreviousMessageSetting}
							onTogglePreviousMail={onTogglePreviousMail}
							expandPrevMail={expandPrevMail}
							previousMessageSetting={previousMessageSetting}
						/>
					)}

					{showDropTargets && (
						<EmbedScrim onDrop={this.handleDropEmbed} onDragOver={this.handleDragOverEmbed} />
					)}
					<div>
						{attachments && (
							<div class={style.attachmentsWrapper}>
								<AttachmentGrid
									attachments={attachments}
									onRemove={onRemoveAttachment}
									uploadingFiles={uploadingFiles}
									removable
								/>
							</div>
						)}
						{!matchesScreenMd && inline && this.footerToolbar()}
					</div>
				</div>
				{matchesScreenMd && (
					<AffixBottom offsetTop={150} container={this.getBase} ref={linkref(this, 'affixBottom')}>
						<div class={style.toolbarWrapper}>{this.footerToolbar()}</div>
					</AffixBottom>
				)}
				{displayLinkEditorDialog && (
					<LinkEditorDialog
						url={url}
						text={text}
						onClose={this.closeLinkEditorDialog}
						onInsertLink={this.addOrUpdateLink}
					/>
				)}
			</div>
		);
	}
}
