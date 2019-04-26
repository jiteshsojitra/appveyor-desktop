import { h } from 'preact';
import { Text } from 'preact-i18n';
import { compose } from 'recompose';
import { Icon, Spinner } from '@zimbra/blocks';
import cx from 'classnames';

import { isMessageTrashed, getShareAttribute } from '../../../utils/mail-item';
import ZimletSlot from '../../zimlet-slot';
import Invitation from '../invitation';
import ShareInvitation from '../../share-invitation';
import HtmlViewer from '../../html-viewer';
import AttachmentGrid from '../../attachment-grid';
import UnreadControl from '../../unread-control';
import StarIcon from '../../star-icon';
import AddressList from '../../address-list';
import EmailTime from '../../email-time';
import ActionMenuMailMore from '../../action-menu-mail-more';
import ActionMenuMailReply from '../../action-menu-mail-reply';
import injectQuoteToggle from '../../../lib/quote-toggle';
import { canEdit, canReplyForward } from '../../../utils/folders';
import MessageSMIMEStatus from '../messageSMIMEStatus';
import AskMeForReadReceipt from '../askMeForReadReceipt';
import MessageSMIMEContactUpdater from '../messageSMIMEContactUpdater';
import style from './style.less';
import { OUTBOX } from '../../../constants/folders';

import { callWith } from '../../../lib/util';

import { minWidth, screenMd, screenSm } from '../../../constants/breakpoints';
import withMediaQuery from '../../../enhancers/with-media-query';

function ResponsiveViewer({
	matchesScreenMd,
	matchesScreenSm,
	isOffline,
	onAddCalendarClicked,
	onReply,
	onReplyAll,
	onForward,
	onShowOriginal,
	onDeleteMailItem,
	onEdit,
	onPrint,
	onDelete,
	onBlock,
	onStarClicked,
	onReadStatusClicked,
	onHeaderClicked,
	isUnread,
	isStarred,
	isConversation,
	isTrashMail,
	disableStarIcon,
	disableReadIcon,
	attachments,
	from,
	sender,
	to,
	cc,
	bcc,
	message,
	loading,
	pending,
	imagesLoading,
	showExternalImagesBanner,
	showSpoofedSenderWarning,
	html,
	fit,
	folder,
	isSigned,
	isEncrypted,
	smimeData,
	onViewCertificate,
	localFolder,
	showAskMeForReadReceipt,
	sendReadReceipt,
	closeReceiptModal
}) {
	const mobile = !matchesScreenMd;
	const regexp = new RegExp(`/${OUTBOX}$`);
	const isOutboxMessage = folder && (folder.name === OUTBOX || folder.name.match(regexp));

	const starControl = !disableStarIcon && (
		<StarIcon
			//class={style.star}
			class={cx(style.star, style.hideBelowXs)}
			onClick={onStarClicked}
			starred={isStarred}
			size={mobile ? 'md' : undefined}
		/>
	);

	const unreadControl = !disableReadIcon && (
		<UnreadControl
			class={cx(style.readStatus, style.hideXsDown)}
			onChange={onReadStatusClicked}
			value={isUnread}
			visible
		/>
	);

	const fromAddressList =
		from && sender && sender.length ? (
			<div class={style.fromAddressList}>
				<AddressList type="from" addresses={sender} wrap={false} bold />{' '}
				<Text id="mail.viewer.onBehalfOf" />{' '}
				<AddressList type="from" addresses={from} wrap={false} bold />
			</div>
		) : (
			<AddressList
				type="from"
				addresses={from}
				className={style.fromAddressList}
				showEmail={matchesScreenSm}
			/>
		);

	const toCcBccAddressList = [
		<AddressList className={style.toAddressList} type="to" addresses={to} />,
		<AddressList className={style.toAddressList} type="cc" addresses={cc} />,
		<AddressList className={style.toAddressList} type="bcc" addresses={bcc} />
	];

	const smimeStatus = (isEncrypted || isSigned) &&
		smimeData && [
			<MessageSMIMEStatus
				smimeData={smimeData}
				isEncrypted={isEncrypted}
				isSigned={isSigned}
				onViewCertificate={onViewCertificate}
			/>,
			<MessageSMIMEContactUpdater senders={from} smimeData={smimeData} />
		];

	const readReceipt = showAskMeForReadReceipt && (
		<AskMeForReadReceipt
			senders={from}
			sendReadReceipt={sendReadReceipt}
			closeReceiptModal={closeReceiptModal}
		/>
	);

	const emailTimeMobile = (
		<div class={cx(style.date, style.hideSmDown)}>
			<EmailTime time={message.date} />
		</div>
	);

	const emailTimeDesktop = (
		<div class={cx(style.date, style.hideMdUp)}>
			<EmailTime time={message.date} />
		</div>
	);

	const replyToLength = (to || []).length + (cc || []).length;

	const mobileControls = (
		<div class={style.controls}>
			<div>
				{(localFolder || canReplyForward(folder.name)) && (
					<ActionMenuMailReply
						onReply={onReply}
						onReplyAll={onReplyAll}
						onForward={onForward}
						actionButtonClass={style.replyActionButton}
						popoverClass={style.replyPopover}
						iconClass={style.replyActionButtonIconClass}
						replyToLength={replyToLength}
					/>
				)}
				{starControl}
			</div>
			{attachments && (
				<div>
					<span class={style.attachmentLabel}>{attachments.length}</span>
					<Icon name="paperclip" size="sm" />
				</div>
			)}
		</div>
	);

	const shareInvitation = message.share &&
		!isMessageTrashed(message) &&
		getShareAttribute(message, 'share', 'action') !== 'delete' && (
			<ShareInvitation message={message} onAccept={onAddCalendarClicked} />
		);

	const invitations =
		message.invitations &&
		message.invitations.map(invitation => <Invitation invitation={invitation} message={message} />);

	const messageBody = (
		<div class={style.body}>
			{!loading && [showExternalImagesBanner, showSpoofedSenderWarning]}

			<HtmlViewer
				class={style.bodyInner}
				html={html}
				scale={fit}
				mutateDom={isConversation && injectQuoteToggle}
				localFolder={localFolder}
			/>
		</div>
	);

	const attachmentsGrid = attachments && (
		<div class={style.attachments}>
			<AttachmentGrid attachments={attachments} isLocalFilePath={localFolder} />
		</div>
	);

	const viewerFooter = (
		<footer class={style.footer}>
			<div class={style.actions}>
				{(localFolder || (folder && canReplyForward(folder.name))) && [
					<button class={style.button} onClick={onReply}>
						<Icon name="mail-reply" class={style.icon} />
						<span class={style.text}>
							<Text id="buttons.reply" />
						</span>
					</button>,

					replyToLength > 1 && (
						<button class={style.button} onClick={onReplyAll}>
							<Icon name="mail-reply-all" class={style.icon} />
							<span class={style.text}>
								<Text id="buttons.replyToAll" />
							</span>
						</button>
					),

					<button class={style.button} onClick={onForward}>
						<Icon name="mail-forward" class={style.icon} />
						<span class={style.text}>
							<Text id="buttons.forward" />
						</span>
					</button>
				]}
				{folder &&
					canEdit(folder.name) && [
						<button class={style.button} onClick={onEdit}>
							<Icon name="pencil" class={style.icon} />
							<span class={style.text}>
								<Text id="buttons.edit" />
							</span>
						</button>,
						<button class={style.button} onClick={callWith(onDeleteMailItem)}>
							<Icon name="trash" class={style.icon} />
							<span class={style.text}>
								<Text id="buttons.delete" />
							</span>
						</button>
					]}
				{!mobile && [
					<ZimletSlot name="desktop-viewer-footer" message={message} />,

					<ActionMenuMailMore
						onDelete={onDelete}
						onMarkRead={onReadStatusClicked}
						onFlag={!isOutboxMessage && onStarClicked}
						onBlock={onBlock}
						onPrint={onPrint}
						onShowOriginal={onShowOriginal}
						isOffline={isOffline}
						isUnread={isUnread}
						isStarred={isStarred}
						arrow={false}
						emailData={message}
						localFolder={localFolder}
					/>
				]}
			</div>
		</footer>
	);

	const loadingSpinner = (pending || imagesLoading) && <Spinner class={style.spinner} />;

	return (
		<div class={cx(style.viewerContent, isTrashMail && style.trashedMail)}>
			<div class={style.headers} onClick={onHeaderClicked}>
				{!mobile ? (
					[
						starControl,
						unreadControl,
						emailTimeMobile,
						fromAddressList,
						toCcBccAddressList,
						smimeStatus,
						emailTimeDesktop,
						readReceipt
					]
				) : (
					<div class={style.header}>
						{unreadControl}

						<div class={style.addressColumn}>
							{fromAddressList}
							{toCcBccAddressList}

							{smimeStatus}

							{readReceipt}

							{emailTimeDesktop}
						</div>

						{mobileControls}
					</div>
				)}

				{shareInvitation}

				{invitations}
			</div>

			{messageBody}

			{attachmentsGrid}

			{viewerFooter}

			{loadingSpinner}
		</div>
	);
}

export default compose(
	withMediaQuery(minWidth(screenMd), 'matchesScreenMd'),
	withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
)(ResponsiveViewer);
