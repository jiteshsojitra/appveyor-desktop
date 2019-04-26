import { h, Component } from 'preact';
import { ModalDialog, Spinner } from '@zimbra/blocks';
import AttachmentViewerToolbar from './toolbar';
import AttachmentViewerControls from './controls';
import cx from 'classnames';
import saveAs from '../../lib/save-as';
import { isImage, isTextFile, hasAttachmentPreview } from '../../utils/attachments';
import { connect } from 'preact-redux';
import {
	setPreviewAttachment,
	previewNextPage,
	previewPreviousPage
} from '../../store/attachment-preview/actions';
import { getSelectedAttachmentPreview } from '../../store/attachment-preview/selectors';
import { configure } from '../../config';
import PdfjsViewer from '../pdfjs-viewer';
import linkref from 'linkref';
import style from './style';
import DownloadAttachment from '../../graphql/queries/download-attachment.graphql';
import { graphql } from 'react-apollo';

@configure('zimbraOrigin')
@connect(
	state => ({
		attachment: getSelectedAttachmentPreview(state),
		isLocalFolder: state.url.routeProps.localFolder,
		page: state.attachmentPreview.selected + 1
	}),
	{
		onClose: setPreviewAttachment,
		onPreviousAttachment: previewPreviousPage,
		onNextAttachment: previewNextPage
	}
)
@graphql(DownloadAttachment, {
	skip: ({ attachment }) => !isTextFile(attachment),
	options: ({ attachment: { messageId, part } }) => ({
		variables: { id: messageId, part }
	}),
	props: ({ data: { downloadAttachment } }) => ({
		textContent: downloadAttachment && downloadAttachment.content
	})
})
export default class AttachmentViewer extends Component {
	state = {
		fullScreen: false,
		pending: false,
		zoom: 1
	};

	download = () => saveAs(this.props.attachment);

	openFullScreen = () => {
		this.setState({ fullScreen: true });
	};
	closeFullScreen = () => {
		this.setState({ fullScreen: false });
	};

	handleClose = () => {
		if (this.state.fullScreen) {
			this.closeFullScreen();
		} else {
			this.props.onClose();
		}
	};

	handlePdfPageChange = pageIndex => {
		this.setState({ currentPage: pageIndex });
	};

	handleLoad = pdfDoc => {
		if (pdfDoc && pdfDoc.numPages) {
			this.setState({ currentPage: 1, numPages: pdfDoc.numPages });
		}
		this.setState({ pending: false });
	};

	handleZoomIn = () => {
		const nextZoom = Math.min(
			this.props.maxZoom,
			(this.state.zoom + this.props.zoomStep).toFixed(2)
		);
		nextZoom !== this.state.zoom && this.setState({ zoom: nextZoom });
	};

	handleZoomOut = () => {
		const nextZoom = Math.max(
			this.props.minZoom,
			(this.state.zoom - this.props.zoomStep).toFixed(2)
		);
		nextZoom !== this.state.zoom && this.setState({ zoom: nextZoom });
	};

	getAttachmentSrc = (attachment = {}) => {
		const { base64, contentType, type, url } = attachment;
		return base64
			? `data:${contentType || type};base64,${base64}`
			: this.props.isLocalFolder
			? url
			: this.context.zimbraBatchClient.getAttachmentUrl(attachment);
	};

	static defaultProps = {
		maxZoom: 3,
		minZoom: 0.5,
		zoomStep: 0.1
	};

	componentWillReceiveProps({ attachment, page }) {
		if (
			this.getAttachmentSrc(attachment) &&
			this.getAttachmentSrc(this.props.attachment || {}) !== this.getAttachmentSrc(attachment)
		) {
			this.setState({
				pending: !isTextFile(attachment),
				currentPage: undefined,
				numPages: undefined
			});
		}
		if (page !== this.props.page && this.state.zoom !== 1) {
			this.setState({ zoom: 1 });
		}
	}

	render(
		{ attachment, onNextAttachment, onPreviousAttachment, textContent },
		{ pending, fullScreen, zoom, currentPage, numPages }
	) {
		const translate = zoom <= 2 ? 50 : 100 / zoom,
			zoomStyle = `transform: scale(${zoom}) translate(-${translate}%, -${translate}%)`;
		const isTextContent = isTextFile(attachment);

		const attachmentToolbar = (
			<AttachmentViewerToolbar
				page={currentPage}
				maxPages={numPages}
				attachment={attachment}
				fullScreen={fullScreen}
				onDownload={this.download}
				onFullScreen={this.openFullScreen}
				onClose={this.handleClose}
			/>
		);

		const viewer = (
			<div class={style.inner} ref={linkref(this, 'inner')}>
				{attachment && (pending || (isTextContent && !textContent)) && <Spinner block />}
				{attachment &&
					hasAttachmentPreview(attachment) &&
					(isImage(attachment) ? (
						<img
							src={this.getAttachmentSrc(attachment)}
							style={zoomStyle}
							class={cx(pending && style.hidden)}
							onLoad={this.handleLoad}
						/>
					) : isTextContent && textContent ? (
						<pre class={style.textFileViewer}>{textContent}</pre>
					) : (
						<PdfjsViewer
							scale={zoom}
							container={this.refs && this.refs.inner}
							src={`${this.getAttachmentSrc(attachment)}${
								attachment.messageId ? '&view=html' : ''
							}`}
							class={cx(pending && style.hidden)}
							onChangePage={this.handlePdfPageChange}
							onLoadDocument={this.handleLoad}
						/>
					))}
			</div>
		);

		const attachmentControls = (
			<AttachmentViewerControls
				onPreviousAttachment={onPreviousAttachment}
				onNextAttachment={onNextAttachment}
				onZoomOut={this.handleZoomOut}
				onZoomIn={this.handleZoomIn}
			/>
		);

		return (
			<div class={cx(style.attachmentViewer, attachment && style.showing)}>
				{fullScreen && (
					<ModalDialog class={style.modal} onClickOutside={this.closeFullScreen}>
						{attachmentToolbar}
						{viewer}
						{attachmentControls}
					</ModalDialog>
				)}
				{attachmentToolbar}
				{viewer}
				{attachmentControls}
			</div>
		);
	}
}
