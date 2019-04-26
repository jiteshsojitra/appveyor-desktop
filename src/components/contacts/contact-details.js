import { h, Component } from 'preact';
import { Text, MarkupText } from 'preact-i18n';
import { compose } from 'recompose';
import Thumbnail from '../thumbnail';
import ContactCard from './contact-card';
import EmailTime from '../email-time';
import wire from 'wiretie';
import { connect } from 'preact-redux';
import { setPreviewAttachment } from '../../store/attachment-preview/actions';
import { configure } from '../../config';
import { getName } from '../../utils/contacts';
import cx from 'classnames';
import style from './style';

// Number of milliseconds to wait before loading additional details for the selected contact.
const LOAD_DETAILS_DELAY = 250;

export default class ContactDetails extends Component {
	/** Being a bit careful here not to fetch details for contacts when someone is scanning the list (ex: via arrow keys)
	 *	To avoid this, delay rendering the attachments/photos/messages details until 250ms has passed.
	 *	Unmounting or re-rendering with a new contact will reset the timer.
	 */

	state = {
		details: false
	};

	reset() {
		if (this.state.details) {
			this.setState({ details: false });
		}
		clearTimeout(this.detailsTimer);
		this.detailsTimer = setTimeout(() => {
			this.setState({ details: true });
		}, LOAD_DETAILS_DELAY);
	}

	componentDidMount() {
		this.reset();
	}

	componentWillReceiveProps({ contact }) {
		if (contact !== this.props.contact) this.reset();
	}

	componentWillUnmount() {
		clearTimeout(this.detailsTimer);
	}

	render(
		{
			contact,
			onClose,
			onSave,
			contactGroups,
			isTrashFolder,
			isSingleSelectAndDeleted,
			isGalContact
		},
		{ details }
	) {
		return (
			<div class={cx(style.contactDetails, details && style.hasDetails)}>
				<div class={style.inner}>
					<ContactCard
						contact={contact}
						isGalContact={isGalContact}
						onClose={onClose}
						onSave={onSave}
						contactGroups={contactGroups}
						isTrashFolder={isTrashFolder}
						isSingleSelectAndDeleted={isSingleSelectAndDeleted}
					/>
					{details && <ContactCommunications contact={contact} />}
				</div>
			</div>
		);
	}
}

@wire('zimbra', ({ contact }) => ({
	emailMessages: contact.attributes && [
		'search',
		{
			query: `from:${contact.attributes.email}`,
			limit: 5
		}
	],
	attachmentMessages: [
		'search',
		{
			query: `from:${
				contact.attributes.email
			} has:attachment NOT attachment:${CONTACT_FILES_EXCLUDED.join(' NOT attachment:')}`,
			fetch: true,
			limit: 5
		}
	],
	imageMessages: [
		'search',
		{
			query: `from:${contact.attributes.email} has:attachment attachment:image/*`,
			fetch: true,
			limit: 5
		}
	]
}))
class ContactCommunications extends Component {
	render({ contact, emailMessages = [], attachmentMessages = [], imageMessages = [] }) {
		const photos =
			(imageMessages &&
				getAttachments(imageMessages, contactPhotosFilter)
					.slice(0, 5)
					.map(({ attachment }) => attachment)) ||
			[];
		const files =
			(attachmentMessages && getAttachments(attachmentMessages, contactFilesFilter).slice(0, 5)) ||
			[];

		return (
			(emailMessages.length || files.length || photos.length) !== 0 && (
				<div class={style.details}>
					<ContactMessages messages={emailMessages} contact={contact} />
					<ContactFiles files={files} contact={contact} />
					<ContactPhotos photos={photos} contact={contact} />
				</div>
			)
		);
	}
}

const ContactMessages = compose(
	wire('zimbra', {
		folderMapping: 'folders.getIdMapping'
	}),
	configure({ slugs: 'routes.slugs' })
)(
	({ contact, messages, pending, folderMapping, slugs }) =>
		contact.attributes && (
			<div
				class={cx(style.contactMessages, (pending || !messages || !messages.length) && style.empty)}
			>
				<h3>
					<MarkupText
						id="contacts.details.messagesFrom"
						fields={{ name: getName(contact.attributes) }}
					/>
				</h3>
				<div class={style.wrapper}>
					{Array.isArray(messages) &&
						messages.map(message => {
							const folder = folderMapping && folderMapping[message.folderId];

							return (
								<a
									class={style.contactMessage}
									href={`/${slugs.email}/${encodeURIComponent(folder || 'Inbox')}/${
										slugs.conversation
									}/${message.conversationId || message.id}?selected=${message.id}`}
								>
									<EmailTime time={message.date} class={style.time} />
									<span class={style.folder} title={folder}>
										{folder}
									</span>
									<span class={style.title} title={message.subject}>
										{message.subject || '[No Subject]'}
									</span>
								</a>
							);
						})}
					<div class={style.contactMoreMessages}>
						<a
							class={style.more}
							href={`/search/${slugs.email}?q=${encodeURIComponent(
								'from:' + contact.attributes.email
							)}`}
						>
							<Text id="contacts.details.viewAll" />
						</a>
					</div>
				</div>
			</div>
		)
);

function getAttachments(messages, typeFilter) {
	if (!Array.isArray(messages)) return [];
	return messages.reduce((attachments, message) => {
		attachments.push(
			...(message.attachments || [])
				.filter(typeFilter || Boolean)
				.map(attachment => ({ attachment, message }))
		);
		return attachments;
	}, []);
}

const CONTACT_FILES_EXCLUDED = ['image/*', 'message/rfc822', 'text/calendar', 'application/ics'];
const CONTACT_FILES_EXCLUDED_REGEX = new RegExp(
	CONTACT_FILES_EXCLUDED.map(mime => mime.replace('*', '.*')).join('|'),
	'i'
);

function contactFilesFilter({ contentType }) {
	return !CONTACT_FILES_EXCLUDED_REGEX.test(contentType);
}

const ContactFiles = ({ contact, files, pending, folderMapping }) => {
	const attachmentGroup = files && files.map(({ attachment }) => attachment);
	return (
		<div class={cx(style.contactFiles, (pending || !files.length) && style.empty)}>
			<h3>
				<MarkupText
					id="contacts.details.filesFrom"
					fields={{ name: getName(contact.attributes) }}
				/>
			</h3>
			<div>
				{files.map(file => (
					<ContactFile {...file} attachmentGroup={attachmentGroup} folderMapping={folderMapping} />
				))}
			</div>
		</div>
	);
};

const ContactFile = connect(
	null,
	(dispatch, props) => ({
		preview: () => dispatch(setPreviewAttachment(props.attachment, props.attachmentGroup))
	})
)(({ message, attachment, preview, folderMapping }) => {
	const folder = folderMapping && folderMapping[message.folderId],
		title = attachment.filename || attachment.name;

	return (
		<a class={style.contactFile} href="javascript:" onClick={preview}>
			<EmailTime time={message.date} class={style.time} />
			<span class={style.folder} title={folder}>
				{folder}
			</span>
			<span class={style.title} title={title}>
				{title}
			</span>
		</a>
	);
});

function contactPhotosFilter({ contentType }) {
	return contentType.match(/image\/.*/i);
}

const ContactPhotos = ({ contact, photos, pending }) => (
	<div class={cx(style.contactPhotos, (pending || !photos.length) && style.empty)}>
		<h3>
			<MarkupText id="contacts.details.photosFrom" fields={{ name: getName(contact.attributes) }} />
		</h3>
		<div class={style.contactPhotosGallery}>
			{photos.map(photo => (
				<ContactPhoto attachment={photo} attachmentGroup={photos} />
			))}
		</div>
	</div>
);

const ContactPhoto = connect(
	null,
	(dispatch, props) => ({
		preview: () => dispatch(setPreviewAttachment(props.attachment, props.attachmentGroup))
	})
)(({ attachment, preview }) => (
	<Thumbnail
		class={style.contactPhoto}
		title={attachment.filename}
		href="javascript:"
		onClick={preview}
		src={attachment.url}
	/>
));
