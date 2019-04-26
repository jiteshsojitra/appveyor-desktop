import { h, Component } from 'preact';
import { withProps, withPropsOnChange } from 'recompose';
import { route } from 'preact-router';
import ResponsiveViewer from './responsive-viewer';
import NakedButton from '../naked-button';
import cx from 'classnames';
import { getEmailHTMLDocument } from '../../lib/html-email';
import { callWith, getEmailDomain, getId, hasFlag, isAddressTrusted } from '../../lib/util';
import { isHiddenAttachmentType } from '../../utils/attachments';
import { findFolder } from '../../utils/folders';
import { isPossiblySpoofedAddress } from '../../utils/phishing';
import ShareInvitationAcceptDialog from '../share-invitation-accept-dialog';
import array from '@zimbra/util/src/array';
import wire from 'wiretie';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import { graphql } from 'react-apollo';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';
import SendDeliveryReportMutation from '../../graphql/mutations/send-delivery-report-mutation.graphql';
import accountInfo from '../../graphql-decorators/account-info';
import get from 'lodash/get';
import find from 'lodash/find';
import cloneDeep from 'lodash-es/cloneDeep';
import style from './style';
import { withModifyPrefs } from '../../graphql-decorators/preferences';
import { USER_FOLDER_IDS } from '../../constants';
import { types as apiClientTypes } from '@zimbra/api-client';
import CertificateModal from '../smime-and-encryption/certificate-modal';
import { REPLY, REPLY_ALL, FORWARD, SHOW_ORIGINAL } from '../../constants/mail';
import { SEND_READ_RECEIPT } from '../../constants/mailbox-metadata';
import { configure } from '../../config';

const { ActionTypeName } = apiClientTypes;

@configure('routes.slugs')
@accountInfo()
@withModifyPrefs()
@withProps(({ account: { prefs } = {}, message }) => ({
	sendReadReceiptPref: get(prefs, SEND_READ_RECEIPT.name),
	isReadReceiptRequested: !!find(get(message, 'emailAddresses'), { type: 'n' }),
	isReadReceiptAlreadySent: hasFlag(message, 'notificationSent'),
	isUnread: hasFlag(message, 'unread'),
	isSentByMe: hasFlag(message, 'sentByMe')
}))
@withPropsOnChange(
	[
		'sendReadReceiptPref',
		'isReadReceiptRequested',
		'isReadReceiptAlreadySent',
		'isUnread',
		'isSentByMe'
	],
	({
		sendReadReceiptPref,
		isReadReceiptRequested,
		isReadReceiptAlreadySent,
		isUnread,
		isSentByMe
	}) => ({
		shouldSendReadReceiptImmediately:
			isUnread &&
			isReadReceiptRequested &&
			!isReadReceiptAlreadySent &&
			sendReadReceiptPref === SEND_READ_RECEIPT.values.always,
		shouldAskToSendReadReceipt:
			!isSentByMe &&
			isReadReceiptRequested &&
			!isReadReceiptAlreadySent &&
			sendReadReceiptPref === SEND_READ_RECEIPT.values.prompt
	})
)
@graphql(GetFolder, {
	options: () => ({
		// Use the same variables as the main query to avoid hitting the network
		variables: {
			view: null
		}
	}),
	props: ({ data, ownProps: { message } }) => ({
		// Note: conversations with messages in multiple folders will not have a folderId
		folder: message.folderId && findFolder(get(data, 'getFolder.folders.0'), message.folderId)
	})
})
@graphql(SendDeliveryReportMutation, {
	props: ({ mutate }) => ({
		sendDeliveryReport: variables => mutate({ variables })
	})
})
@connect((state, {}) => {
	const { email = {} } = state;

	return {
		fit: email.fit === true,
		trashFolder: get(state, 'trashFolder.folderInfo'),
		isOffline: get(state, 'network.isOffline')
	};
})
@wire('zimbra', null, zimbra => ({
	isPreloaded: zimbra.images.isPreloaded,
	isPreloading: zimbra.images.isPreloading,
	preloadImage: zimbra.images.preload
}))
export default class Viewer extends Component {
	state = {
		tmpTrustedSenders: []
		// showAddCalendarModal: false
	};

	markMsgAsRead = () => {
		const msgIsUnread = this.isUnread();
		msgIsUnread &&
			this.props.onMarkRead(
				msgIsUnread,
				this.props.message.id,
				false,
				false,
				ActionTypeName.MsgAction
			);
	};

	handleActionBtn = actionType => {
		this.markMsgAsRead();
		const { slugs, message, onReply, onReplyAll, onForward, onShowOriginal } = this.props;
		const invitationId = this.checkInvitation();
		const recurrenceFlag = get(message, 'invitations.0.components.0.recurrence') ? '/all' : '';
		switch (actionType) {
			case 'REPLY':
				onReply(message);
				break;
			case 'REPLY_ALL':
				onReplyAll(message);
				break;
			case 'FORWARD':
				invitationId
					? route(`/${slugs.calendar}/event/forward/${invitationId}${recurrenceFlag}`)
					: onForward(message);
				break;
			case 'SHOW_ORIGINAL':
				onShowOriginal(get(message, 'id'));
				break;
		}
	};

	checkInvitation = () => {
		const { message } = this.props;
		const methodType = get(message, 'invitations.0.components.0.method');
		return methodType === 'REQUEST' && message.id;
	};

	print = () => this.props.onPrint(this.props.message);

	//temporarily trust the images for the duration of this browser session
	trustImages = () => {
		this.setState({
			tmpTrustedSenders: this.state.tmpTrustedSenders.concat(this.getFromEmail().address)
		});
	};

	addTrustedDomainOrAddress = domainOrAddress => {
		//store the preference of trusting the domain or address long term
		const { zimbraPrefMailTrustedSenderList } = get(this.props, 'account.prefs') || {};
		this.props.modifyPrefs({
			zimbraPrefMailTrustedSenderList: array(zimbraPrefMailTrustedSenderList).concat(
				domainOrAddress
			)
		});
		this.trustImages();
	};

	shouldShowExternalImages = () => {
		const { zimbraPrefDisplayExternalImages, zimbraPrefMailTrustedSenderList } =
			get(this.props, 'account.prefs') || {};
		//if user always allows external images to be shown in global pref, then show images
		if (zimbraPrefDisplayExternalImages && +this.props.folder.id !== USER_FOLDER_IDS.JUNK)
			return true;
		//if user has temporarily authorized this sender, then show images
		const fromAddress = this.getFromEmail().address;
		if (fromAddress && this.state.tmpTrustedSenders.indexOf(fromAddress) !== -1) return true;
		//check address against trusted addresses/domains pref
		return isAddressTrusted(fromAddress, zimbraPrefMailTrustedSenderList);
	};

	getFromEmail = () => find(this.props.message.emailAddresses, ['type', 'f']);

	getText(message) {
		return (message && (message.html || message.text)) || '';
	}

	preloadImages(resources) {
		let total = 1,
			loaded = 0;
		const { isPreloaded, isPreloading, preloadImage } = this.props,
			done = () => ++loaded === total && this.setState({ imagesLoading: false });
		for (let i = 0; i < resources.length; i++) {
			if (!isPreloaded(resources[i]) && !isPreloading(resources[i])) {
				total++;
				preloadImage(resources[i]).then(done);
			}
		}
		if (total > 1) {
			done();
			this.setState({ imagesLoading: true });
			return true;
		}
		return false;
	}

	isFlagged = () => hasFlag(this.props.message, 'flagged');

	isUnread = () => hasFlag(this.props.message, 'unread');

	handleDelete = () => {
		const { isConversation, message, conversation, onDelete } = this.props;

		isConversation && message.conversationId === conversation.id && conversation.messages.length < 2
			? onDelete(conversation.id, false)
			: onDelete(message.id, false, message.folderId, ActionTypeName.MsgAction);
	};

	handleBlock = () => {
		this.props.onBlock(this.props.message);
	};

	handleStarClick = () => {
		this.props.onFlag(
			!this.isFlagged(),
			this.props.message.id,
			false,
			false,
			ActionTypeName.MsgAction
		);
	};

	handleReadStatusClick = () => {
		this.props.onMarkRead(
			this.isUnread(),
			this.props.message.id,
			false,
			false,
			ActionTypeName.MsgAction
		);
	};

	handleHeaderClick = e => {
		const { target, currentTarget } = e;
		if (target !== currentTarget && target.parentNode !== currentTarget) return;
		this.props.onHeaderClick && this.props.onHeaderClick(this.props.message);
	};

	handleAddCalendarClick = () => {
		this.setState({ showAddCalendarModal: true });
	};

	handleAddCalendarModalCancel = () => {
		this.setState({ showAddCalendarModal: false });
	};

	handleViewCertificate = () => {
		this.setState({ showCertificate: !this.state.showCertificate });
	};

	handleReadReceiptDelivery = props => {
		const {
			message: { id },
			sendDeliveryReport,
			onDeliveringReadReceipt
		} = props || this.props;

		sendDeliveryReport({
			messageId: id
		}).then(() => {
			onDeliveringReadReceipt(id, true);
		});
	};

	handleCloseReceiptModal = () => {
		const {
			message: { id },
			onDeliveringReadReceipt
		} = this.props;
		onDeliveringReadReceipt(id, false);
	};

	componentDidMount() {
		this.props.shouldSendReadReceiptImmediately && this.handleReadReceiptDelivery(this.props);
	}

	componentWillReceiveProps(nextProps) {
		if (getId(nextProps.message) !== getId(this.props.message)) {
			nextProps.shouldSendReadReceiptImmediately && this.handleReadReceiptDelivery(nextProps);

			this.setState({
				imagesLoading: false
			});
		}
	}

	render(
		{
			isOffline,
			message,
			inline,
			focus,
			fit,
			isConversation,
			pending,
			folder,
			onDeleteMailItem,
			onEdit,
			isTrashSubFolder,
			disableStarIcon,
			disableReadIcon,
			smimeData,
			localFolder,
			smimeData: { certchain } = {},
			shouldAskToSendReadReceipt
		},
		{ imagesLoading, showAddCalendarModal, showCertificate }
	) {
		const resources = [];
		const allowImages = this.shouldShowExternalImages();
		const fromEmail = this.getFromEmail();
		const fromDomain = getEmailDomain(fromEmail.address);
		const html = getEmailHTMLDocument(cloneDeep(message), { allowImages, resources });
		const externalImages = resources.filter(c => c.mode === 'external');
		const isTrashMail =
			isTrashSubFolder ||
			(message.folderId && message.folderId === USER_FOLDER_IDS.TRASH.toString()) ||
			message.folderId === get(this.props, 'trashFolder.id');

		if (!imagesLoading && resources.length && allowImages) {
			imagesLoading = this.preloadImages(resources);
		}

		const attachments =
			message.attachments &&
			message.attachments.length > 0 &&
			message.attachments.filter(
				attachment =>
					!isHiddenAttachmentType(attachment) &&
					(!attachment.contentId || html.indexOf(attachment.contentId.replace(/[<>]/g, '')) === -1)
			);

		const loading = pending || !html;

		let showExternalImagesBanner;
		if (folder && !allowImages && externalImages.length > 0) {
			showExternalImagesBanner = (
				<ShowExternalImagesBanner
					onTrustImages={this.trustImages}
					onAddTrustedDomainOrAddress={this.addTrustedDomainOrAddress}
					fromDomain={fromDomain}
					fromAddress={fromEmail.address}
				/>
			);
		}

		let showSpoofedSenderWarning;
		if (isPossiblySpoofedAddress({ email: fromEmail.address, name: fromEmail.name })) {
			showSpoofedSenderWarning = <SpoofedAddressWarningBanner />;
		}

		return (
			<div
				class={cx(
					style.viewer,
					inline ? style.inline : style.full,
					focus && style.focus,
					loading && style.loading
				)}
			>
				{showCertificate && certchain && (
					<CertificateModal
						cert={certchain.find(c => c.subject && c.subject.email)}
						onClose={this.handleViewCertificate}
					/>
				)}
				{showAddCalendarModal && (
					<ShareInvitationAcceptDialog
						message={message}
						onCancel={this.handleAddCalendarModalCancel}
					/>
				)}
				<ResponsiveViewer
					isOffline={isOffline}
					onAddCalendarClicked={this.handleAddCalendarClick}
					onHeaderClicked={this.handleHeaderClick}
					onStarClicked={this.handleStarClick}
					onReadStatusClicked={this.handleReadStatusClick}
					onForward={callWith(this.handleActionBtn, FORWARD)}
					onReply={callWith(this.handleActionBtn, REPLY)}
					onReplyAll={callWith(this.handleActionBtn, REPLY_ALL)}
					onShowOriginal={callWith(this.handleActionBtn, SHOW_ORIGINAL)}
					onPrint={this.print}
					onDeleteMailItem={onDeleteMailItem}
					onEdit={onEdit}
					onViewCertificate={this.handleViewCertificate}
					onAddTrustedDomainAddress={this.addTrustedDomainOrAddress}
					onTrustImages={this.trustImages}
					isConversation={isConversation}
					isUnread={this.isUnread()}
					isStarred={this.isFlagged()}
					onDelete={this.handleDelete}
					onBlock={this.handleBlock}
					disableReadIcon={disableReadIcon}
					disableStarIcon={disableStarIcon}
					attachments={attachments}
					message={message}
					folder={folder}
					fromDomain={fromDomain}
					loading={loading}
					pending={pending}
					imagesLoading={imagesLoading}
					showExternalImagesBanner={showExternalImagesBanner}
					showSpoofedSenderWarning={showSpoofedSenderWarning}
					isTrashMail={isTrashMail}
					html={html}
					fit={fit}
					from={message.from}
					sender={message.sender}
					to={message.to}
					cc={message.cc}
					bcc={message.bcc}
					isEncrypted={get(message, 'attributes.isEncrypted')}
					isSigned={get(message, 'attributes.isSigned')}
					smimeData={smimeData}
					localFolder={localFolder}
					showAskMeForReadReceipt={shouldAskToSendReadReceipt}
					sendReadReceipt={this.handleReadReceiptDelivery}
					closeReceiptModal={this.handleCloseReceiptModal}
				/>
			</div>
		);
	}
}

function ShowExternalImagesBanner({
	onTrustImages,
	onAddTrustedDomainOrAddress,
	fromDomain,
	fromAddress
}) {
	return (
		<div class={style.warningBanner}>
			<div>
				<Text id="mail.viewer.messageContainsExternalImages" />.{' '}
				<NakedButton linkColor onClick={onTrustImages}>
					<Text id="mail.viewer.clickToLoad" />
				</NakedButton>
			</div>
			<div>
				<Text id="mail.viewer.alwaysDisplayImagesFrom" />{' '}
				<NakedButton linkColor onClick={callWith(onAddTrustedDomainOrAddress, fromDomain)}>
					{fromDomain}
				</NakedButton>{' '}
				<Text id="mail.viewer.or" />{' '}
				<NakedButton linkColor onClick={callWith(onAddTrustedDomainOrAddress, fromAddress)}>
					{fromAddress}
				</NakedButton>
			</div>
		</div>
	);
}

function SpoofedAddressWarningBanner() {
	return (
		<div class={style.warningBanner}>
			<Text id="mail.viewer.spoofedAddressWarning" />
		</div>
	);
}
