import { h, Component } from 'preact';
import cx from 'classnames';
import DocumentAttachment from '../document-attachment';
import PictureAttachment from '../picture-attachment';
import orderedGroupByPairs from '../../utils/ordered-group-by-pairs';
import { getAttachmentPreviewVisibility } from '../../store/attachment-preview/selectors';
import { getDateKey, callWith } from '../../lib/util';
import style from './style';
import { connect } from 'preact-redux';

@connect(state => ({
	isAttachmentViewerOpen: getAttachmentPreviewVisibility(state),
	isOffline: state.network.isOffline
}))
export default class AttachmentsPane extends Component {
	groupItems = () => {
		const { items, sortBy, groupByDate } = this.props;

		if (groupByDate && (!sortBy || sortBy.match(/^date/))) {
			return orderedGroupByPairs(items, m => getDateKey(m.message.date));
		}

		return [[null, items]];
	};

	render = ({
		items,
		onDownload,
		onEmail,
		onTogglePreviewer,
		isAttachmentViewerOpen,
		renderNoItems,
		isPicturesPane,
		isOffline,
		renderOfflineMessage
	}) => {
		const attachItems = items && this.groupItems();
		const allAttachments =
			items && items.reduce((old, current) => [].concat(old, current.attachment), []);
		const listProps = {
			attachItems,
			allAttachments,
			onDownload,
			onEmail,
			onTogglePreviewer,
			isOffline,
			renderOfflineMessage
		};
		return (
			<div class={cx(style.attachmentPane, isAttachmentViewerOpen && style.attachmentViewerOpen)}>
				{items && items.length > 0 ? (
					isPicturesPane ? (
						<PicturesList {...listProps} />
					) : (
						<DocumentsList {...listProps} />
					)
				) : (
					renderNoItems(this.props)
				)}
			</div>
		);
	};
}

const DocumentsList = ({
	attachItems,
	allAttachments,
	onDownload,
	onEmail,
	onTogglePreviewer,
	isOffline,
	renderOfflineMessage
}) => (
	<div class={style.attachmentList} scrollbar>
		{attachItems.map(([label, itemsByDate]) => (
			<div key={label} class={style.messageGroup}>
				{label && <div class={cx(style.dateRowLabel, style.wideDateRowLabel)}>{label}</div>}
				{itemsByDate.map(item => (
					<div class={style.documentItem} onClick={callWith(onDownload, item.attachment)()}>
						<DocumentAttachment
							item={item}
							onDownload={onDownload}
							onEmail={onEmail}
							onTogglePreviewer={onTogglePreviewer}
							allAttachments={allAttachments}
						/>
					</div>
				))}
			</div>
		))}
		{isOffline && renderOfflineMessage && renderOfflineMessage()}
	</div>
);

const PicturesList = ({
	attachItems,
	allAttachments,
	onDownload,
	onEmail,
	onTogglePreviewer,
	isOffline,
	renderOfflineMessage
}) => (
	<div class={style.attachmentList} scrollbar>
		{attachItems.map(([label, itemsByDate]) => (
			<div key={label} class={style.messageGroup}>
				{label && <div class={cx(style.dateRowLabel, style.wideDateRowLabel)}>{label}</div>}
				<div class={style.picturesContainer}>
					{itemsByDate.map((item, index) => (
						<div class={style.pictureItem} onClick={callWith(onDownload, item.attachment)()}>
							<PictureAttachment
								togglePreviewer={onTogglePreviewer}
								item={item}
								onDownload={onDownload}
								onEmail={onEmail}
								allAttachments={allAttachments}
								imageIndex={index}
								onImageLoaded={this.onImageLoaded}
								self={this}
							/>
						</div>
					))}
				</div>
			</div>
		))}
		{isOffline && renderOfflineMessage && renderOfflineMessage()}
	</div>
);
