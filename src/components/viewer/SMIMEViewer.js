import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import Viewer from '../viewer';
import { graphql } from 'react-apollo';
import get from 'lodash/get';
import { downloadMessage } from '../../graphql/queries/smime/download-message.graphql';
import smimeHandler from '@zimbra/electron-app/src/smime';
import { Spinner } from '@zimbra/blocks';
import { convertMessageToZimbra } from '../../graphql-decorators/send-message';
import Draft from '../draft';
import { isSignedMessage, isEncryptedMessage, isSMIMEMessage } from '../../utils/mail-item';

@connect(state => ({
	isOffline: get(state, 'network.isOffline')
}))
@graphql(downloadMessage, {
	skip: ({ message }) => !message.id || !isSMIMEMessage(message),
	options: ({ message: { id } }) => ({
		variables: { id },
		fetchPolicy: 'cache-first'
	}),
	props: ({ data: { downloadMessage: msg, loading, error } }) => ({
		secureMsg: msg && msg.content,
		secureMsgLoading: loading,
		secureMsgError: error
	})
})
export default class SMIMEViewer extends Component {
	parseMessage = ({ secureMsg }) => {
		const { parsingMessage } = this;

		if (smimeHandler && !parsingMessage && secureMsg) {
			this.parsingMessage = true;
			smimeHandler({
				operation: 'decode',
				data: secureMsg
			})
				.then(({ signers, message }) => {
					this.parsingMessage = false;
					this.setState({
						parsedSigners: signers,
						parsedMessage: message
					});
				})
				.catch(err => {
					this.parsingMessage = false;
					this.setState({
						parsedSigners: null,
						parsedMessage: null
					});
					console.error(err);
				});
		}
	};

	componentWillMount() {
		this.parseMessage(this.props);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.secureMsg !== this.props.secureMsg) {
			this.parseMessage(nextProps);
		}

		if (!nextProps.secureMsg && this.state.parsedMessage) {
			this.parsingMessage = false;
			this.setState({
				parsedSigners: null,
				parsedMessage: null
			});
		}
	}

	shouldComponentUpdate(nextProps) {
		// for SMIME messages, when the message is being parsed, prevent the component from rendering child components
		const { parsingMessage } = this;
		const { message } = nextProps;

		if (message && isSMIMEMessage(message)) {
			return !parsingMessage;
		}

		return true;
	}

	componentWillUnmount() {
		this.parsingMessage = false;
	}

	render({ message: originalMessage, secureMsgLoading, isDraft, secureMsg, isOffline }) {
		const { parsingMessage } = this;
		const { parsedMessage, parsedSigners } = this.state;
		const isEncrypted = isEncryptedMessage(originalMessage),
			isSigned = isSignedMessage(originalMessage);

		if (
			(secureMsgLoading && !secureMsg) ||
			((isEncrypted || isSigned) && (parsingMessage || !secureMsg))
		) {
			return <Spinner block />;
		}

		const { status, emails, certchain } = get(parsedSigners, '0', {}),
			message = parsedMessage && convertMessageToZimbra(parsedMessage);

		const childProps = {
			...this.props,
			...(parsedMessage &&
				((isEncrypted && !isSigned) || // Bypass messages which are "Encrypted, but not Signed"
					(parsedSigners && parsedSigners[0])) && {
					message: {
						...originalMessage,
						attributes: {
							...originalMessage.attributes,
							...parsedMessage.attributes // Based on settings, Outlook sometimes send Signed only msg as Encr as well, its better to update its actual status after decoding.
						},
						mimeParts: get(message, 'mimeParts.0.mimeParts'),
						attachments: get(parsedMessage, 'attachments'),
						inlineAttachments: get(parsedMessage, 'inlineAttachments'),
						html: get(parsedMessage, 'html'),
						text: get(parsedMessage, 'text'),
						isDecodedMessage: true
					},
					smimeData: {
						status,
						emails,
						certchain
					}
				})
		};

		if (isDraft) {
			return <Draft {...childProps} messageDraft={childProps.message} isOffline={isOffline} />;
		}
		return <Viewer {...childProps} />;
	}
}
