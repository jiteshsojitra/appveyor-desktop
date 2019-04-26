import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import { graphql } from 'react-apollo';
import get from 'lodash/get';
import isEmpty from 'lodash-es/isEmpty';
import moment from 'moment';
import { configure } from '../../config';
import ConversationQuery from '../../graphql/queries/conversation.graphql';
import MessageQuery from '../../graphql/queries/message.graphql';
import HtmlViewer from '../html-viewer';
import { getEmailHTMLDocument } from '../../lib/html-email';
import prettyBytes from 'pretty-bytes';
import cloneDeep from 'lodash-es/cloneDeep';

import style from './style.less';

@configure({ urlSlug: 'routes.slugs.email' })
@graphql(MessageQuery, {
	name: 'messageQuery',
	options: ({ id }) => ({ variables: { id } })
})
@graphql(ConversationQuery, {
	name: 'conversationQuery',
	options: ({ id }) => ({
		variables: {
			id,
			fetch: 'all',
			html: true,
			needExp: true,
			max: 250000,
			neuter: false
		}
	})
})
@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatDateTimeFirstEmail: `${timeFormats}.formatDateTimeFirstEmail`,
		formatDateTimeEmail: `${timeFormats}.formatDateTimeEmail`
	};
})
export default class EmailPrint extends Component {
	state = {
		openedPrintPreview: false
	};

	generateMessage = message => {
		let html = getEmailHTMLDocument(cloneDeep(message));
		const inlineAttachments = message.inlineAttachments;

		if (!isEmpty(html)) {
			if (!isEmpty(inlineAttachments)) {
				inlineAttachments.forEach(({ contentId, url }) => {
					html = html.replace(`src="cid:${contentId}"`, `src="${url}" data-cid="${contentId}"`);
				});
			}
		} else {
			html = '';
			if (!isEmpty(message.excerpt)) {
				html = message.excerpt;
			}
		}

		return <HtmlViewer html={html} disableProcessors />;
	};

	getAttachment = attachment => {
		const attchSize = `(${prettyBytes(attachment.size)})`;

		if ('message/delivery-status' === attachment.contentType) {
			return ` Delivery Status ${attchSize}`;
		} else if (!isEmpty(attachment.filename)) {
			return `${attachment.filename} ${attchSize}`;
		}

		return ` ${attchSize}`;
	};

	generateAttachments = attachments => (
		<div>
			<div className={style.separator} />
			<div>
				<Text id="mail.print.attachments" />
				{attachments.map(attch => (
					<div className={style.attachmentTitle}>{this.getAttachment(attch)}</div>
				))}
			</div>
		</div>
	);

	generateFirstEmail = messages => {
		// get the first message
		const message = messages[messages.length - 1];

		const date = moment(message.date).format(this.props.formatDateTimeFirstEmail);
		const subject = message.subject || '[No Subject]';
		let emailAddressesFrom = '',
			emailAddressesTo = '',
			emailAddressesCc = '';

		message.emailAddresses.map(email => {
			switch (email.type) {
				case 'f':
					emailAddressesFrom +=
						(emailAddressesFrom && ', ') + (email.name || email.address) + ` <${email.address}>`;
					break;
				case 't':
					emailAddressesTo +=
						(emailAddressesTo && ', ') + (email.name || email.address) + ` <${email.address}>`;
					break;
				case 'c':
					emailAddressesCc +=
						(emailAddressesCc && ', ') + (email.name || email.address) + ` <${email.address}>`;
					break;
			}
		});

		return (
			<div>
				<div className={style.printHeader}>
					<div className={style.printHeaderCol1}>
						<Text id="mail.print.header.subject" />
					</div>
					<div className={style.printHeaderCol2}>{subject}</div>
					<br />

					<div className={style.separator} />
					<div className={style.printHeaderCol1}>
						<Text id="mail.print.header.from" />
					</div>
					<div className={style.printHeaderCol2}>{emailAddressesFrom}</div>
					<br />

					<div className={style.separator} />
					<div className={style.printHeaderCol1}>
						<Text id="mail.print.header.to" />
					</div>
					<div className={style.printHeaderCol2}>{emailAddressesTo}</div>
					<br />

					{!isEmpty(emailAddressesCc) && (
						<div>
							<div className={style.separator} />
							<div className={style.printHeaderCol1}>
								<Text id="mail.print.header.cc" />
							</div>
							<div className={style.printHeaderCol2}>{emailAddressesCc}</div>
							<br />
						</div>
					)}

					<div className={style.separator} />
					<div className={style.printHeaderCol1}>
						<Text id="mail.print.header.date" />
					</div>
					<div className={style.printHeaderCol2}>{date}</div>
					<br />
					<div className={style.separator} />
				</div>

				<div className={style.printMessage}>{this.generateMessage(message)}</div>

				{message.attachments && this.generateAttachments(message.attachments, message.fol)}

				<br />
			</div>
		);
	};

	generateEmails = messages =>
		messages
			.slice(0)
			.reverse()
			.reduce((acc, message, index) => {
				if (!index) {
					return '';
				}

				const date = moment(message.date).format(this.props.formatDateTimeEmail);
				const subject = message.subject || '[No Subject]';
				let emailAddressesFrom = '',
					emailAddressesTo = '',
					emailAddressesCc = '';

				message.emailAddresses.map(email => {
					switch (email.type) {
						case 'f':
							emailAddressesFrom +=
								(emailAddressesFrom && ', ') +
								(email.name || email.address) +
								` <${email.address}>`;
							break;
						case 't':
							emailAddressesTo +=
								(emailAddressesTo && ', ') + (email.name || email.address) + ` <${email.address}>`;
							break;
						case 'c':
							emailAddressesCc +=
								(emailAddressesCc && ', ') + (email.name || email.address) + ` <${email.address}>`;
							break;
					}
				});

				return (
					<div>
						<div className={style.printHeader}>
							<div className={style.separator} />
							<div className={style.printHeaderCol1}>
								<Text id="mail.print.header.from" />
							</div>
							<div className={style.printHeaderCol2}>{emailAddressesFrom}</div>
							<br />

							<div className={style.separator} />
							<div className={style.printHeaderCol1}>
								<Text id="mail.print.header.to" />
							</div>
							<div className={style.printHeaderCol2}>{emailAddressesTo}</div>
							<br />

							{!isEmpty(emailAddressesCc) && <div className={style.separator} />}
							{!isEmpty(emailAddressesCc) && (
								<div>
									<div className={style.printHeaderCol1}>
										<Text id="mail.print.header.cc" />
									</div>
									<div className={style.printHeaderCol2}>{emailAddressesCc}</div>
								</div>
							)}

							<div className={style.separator} />
							<div className={style.printHeaderCol1}>
								<Text id="mail.print.header.sent" />
							</div>
							<div className={style.printHeaderCol2}>{date}</div>
							<br />
							<div className={style.separator} />

							<div className={style.printHeaderCol1}>
								<Text id="mail.print.header.subject" />
							</div>
							<div className={style.printHeaderCol2}>{subject}</div>
							<br />
						</div>

						<div className={style.printMessage}>{this.generateMessage(message)}</div>

						{message.attachments && this.generateAttachments(message.attachments)}

						<br />
					</div>
				);
			}, '');

	generateHtml = mailItem => {
		const renderedPage = (
			<div className={style.messages}>
				{this.generateFirstEmail(mailItem.messages)}
				{this.generateEmails(mailItem.messages)}
			</div>
		);
		return renderedPage;
	};

	render({ conversationQuery, messageQuery, id }, { openedPrintPreview }) {
		if (
			messageQuery.loading ||
			conversationQuery.loading ||
			(messageQuery.error && conversationQuery.error)
		) {
			return null;
		}
		const mailItem =
			(conversationQuery &&
				get(conversationQuery, 'conversation.id') === id &&
				conversationQuery.conversation) ||
			(messageQuery && messageQuery.message);

		if (!openedPrintPreview) {
			setTimeout(() => window.print(), 1500);
			this.setState({ openedPrintPreview: true });
		}

		return this.generateHtml(mailItem);
	}
}
