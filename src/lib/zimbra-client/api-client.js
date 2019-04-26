import h from 'vhtml';
import events from 'mitt';
import flatten from 'lodash/flatten';
import values from 'lodash/values';
import includes from 'lodash-es/includes';
import get from 'lodash-es/get';
import apiRequest from '../api-request';

/** @jsx h */

const MESSAGE_FIELD_MAP = {
	u: 'unread',
	f: 'flag',
	d: 'date',
	did: 'draftId',
	su: 'subject',
	fr: 'excerpt',
	e: 'senders',
	irt: 'inReplyTo',
	idnt: 'identityId',
	inv: 'invitations',

	l: 'folderId',

	mp: 'mimeParts',
	mid: 'messageId',
	origid: 'origId',
	cid: 'conversationId',
	sd: 'sentDate',
	rt: 'replyType'
};

const RESPONSE_FIELD_MAP = {
	m: 'messages',
	c: 'conversations',
	appt: 'appointments',
	cn: 'contacts'
};

const TYPED_MAPS = {
	attach: {
		aid: 'attachmentId'
	},
	sender: {
		a: 'address',
		p: 'name',
		d: 'shortName',
		t: 'type'
	},
	message: {
		...MESSAGE_FIELD_MAP
	},
	conversation: {
		...MESSAGE_FIELD_MAP
	},
	mimePart: {
		s: 'size',
		cd: 'contentDisposition',
		ct: 'contentType',
		ci: 'contentId',
		cl: 'contentLocation'
	},
	appointment: {
		l: 'folderId',
		fr: 'excerpt',
		or: 'organizer',
		fb: 'freeBusy',
		fba: 'freeBusyActual',
		d: 'date',
		dur: 'duration',
		inst: 'instances',
		invId: 'inviteId'
	},
	instance: {
		s: 'start',
		ridZ: 'recurrenceId'
	},
	folder: {
		u: 'unread',
		n: 'count',
		l: 'parentFolderId',
		f: 'flag'
	},
	invitation: {
		d: 'date',
		comp: 'components',
		or: 'organizer',
		at: 'attendees',
		loc: 'location',
		s: 'sent',
		transp: 'transparency',
		fb: 'freeBusy',
		fba: 'freeBusyActual',
		ex: 'exception',
		ptst: 'participationStatus',
		recur: 'recurrence'
	},
	component: {
		e: 'end',
		desc: 'description'
	},
	attendee: {
		a: 'address',
		d: 'name'
	},
	organizer: {
		a: 'address',
		d: 'name'
	},
	contact: {
		d: 'date',
		l: 'folderId',
		m: 'members',
		sf: 'sortField',
		t: 'tags',
		tn: 'tagNames'
	}
};

// @TODO refactor api serialization and normalization, keys are
// currently being improperly denested.
const DENEST_KEY_BLACKLIST = [
	'date',
	'end',
	'email',
	'homeEmail',
	'workEmail',
	'fileAs',
	'firstName',
	'lastName',
	'company',
	'phone',
	'homePhone',
	'workPhone',
	'fax',
	'mobile',
	'pager',
	'zimbraPrefFoldersExpanded',
	'filterRules',
	'filterActions',
	'actionFileInto',
	'grant',
	'share',
	'usr',
	'dataSources',
	'imap',
	'pop3',
	'lastError',
	'relatedContacts',
	'data'
];

function normalizeCid(cid) {
	return cid.replace(/[<>]/g, '');
}

function reverseNiceKey(name, type) {
	const map = (type && TYPED_MAPS[type]) || MESSAGE_FIELD_MAP;
	for (const i in map) {
		if (map[i] === name) return i;
	}
}

function parseSenders(message) {
	if (message.senders == null) return;
	const mapping = { f: 'from', t: 'to', c: 'cc', b: 'bcc', s: 'sender' };
	for (let i = 0; i < message.senders.length; i++) {
		const sender = message.senders[i],
			key = mapping[sender.type];
		(message[key] || (message[key] = [])).push(parseAddress(sender));
	}
}

function parseAddress(address) {
	if (typeof address === 'string') {
		const parts = address.match(/(['"])(.*?)\1\s*<(.+)>/);
		if (parts) {
			return { address: parts[3], name: parts[2] };
		}
		return { address };
	}
	return address;
}

export function normalizeToZimbra(obj, path) {
	const type = typeof obj;
	if (type === 'boolean') return obj ? 'TRUE' : 'FALSE';
	if (type === 'number') return String(obj);

	path = path || [];
	if (obj && type === 'object') {
		const out = Array.isArray(obj) ? [] : {};
		for (const niceKey in obj) {
			if (obj.hasOwnProperty(niceKey)) {
				let i = reverseNiceKey(niceKey) || niceKey;
				for (let j = path.length; j--; ) {
					if (TYPED_MAPS[path[j]] !== undefined) {
						const key = reverseNiceKey(niceKey, path[j]);
						if (key) {
							i = key;
							break;
						}
					}
				}

				out[i] = normalizeToZimbra(obj[niceKey], path.concat(niceKey.replace(/s$/, '')));
			}
		}
		obj = out;
		// obj = denest(out);
	}

	return obj;
}

const CLASSIFIERS = [
	{
		name: 'conversation',
		test: obj => 'senders' in obj && obj.messages !== undefined,
		process(conversation) {
			if (conversation.senders) {
				parseSenders(conversation);
			}
			if (
				conversation.messages &&
				conversation.messages[0] &&
				!('senders' in conversation.messages[0])
			) {
				conversation.messages = conversation.messages.reverse();
			}
			return conversation;
		}
	},
	{
		name: 'message',
		test: obj => ('senders' in obj || 'mimeParts' in obj) && !('apptId' in obj) && !obj.messages,
		process(message, context) {
			parseSenders(message);

			const processAttachment = ({ ...attachment }) => {
				attachment.messageId = attachment.messageId || message.id;
				attachment.url = context.attachments.getUrl(attachment);
				if (attachment.contentId) {
					attachment.contentId = normalizeCid(attachment.contentId);
				}
				return attachment;
			};

			reduceMimeParts(
				message,
				(part, i, acc) => {
					let isBody = false;
					const type = normalizeType(part.contentType),
						disposition = normalizeDisposition(part.contentDisposition),
						content = part.content; //getPartContent(part);

					// obey scapi's isBody flag:
					if (isBody) acc.body = content;

					// if not explicitly an attachment, discover html/text body:
					if (disposition !== 'attachment') {
						const bodyType = type === 'text/html' ? 'html' : type === 'text/plain' && 'text';
						if (bodyType && (!acc[bodyType] || disposition !== 'inline')) {
							acc[bodyType] = content;
							isBody = true;
						}
					}

					// remaining non-body, non-enclosure parts are attachments:
					if (!isBody && type.split('/')[0] !== 'multipart') {
						const mode = disposition === 'inline' ? 'inlineAttachments' : 'attachments';
						(acc[mode] || (acc[mode] = [])).push(processAttachment(part));
					}

					return acc;
				},
				message
			);

			// Default to null if not exist to unset the key if this is an update.
			message.autoSendTime = message.autoSendTime || null;

			return message;
		}
	},
	{
		name: 'invitation',
		test: obj => 'organizer' in obj,
		process(obj) {
			obj.location = parseAddress(obj.location);
			return obj;
		}
	},
	{
		name: 'note',
		test: (obj, path) =>
			path.length >= 2 && path[path.length - 2] === 'note' && obj.hasOwnProperty('content'),
		process(note) {
			note.content = JSON.parse(note.content);
			return note;
		}
	},
	{
		name: 'contact', //process contact and contact groups
		test: (obj, path) =>
			!Array.isArray(obj) && path.lastIndexOf('contact') >= Math.max(path.length - 2, 0),
		process(contact) {
			if (contact.hasOwnProperty('members')) {
				contact = Object.assign([], contact);
				//hoist contact group members to top level
				contact.members.forEach(member => {
					member.contacts ? contact.push(...member.contacts) : contact.push(member);
				});
				delete contact.members;
			} else {
				contact = Object.assign({}, contact);
			}

			contact.attributes = contact._attrs;
			delete contact._attrs;

			return contact;
		}
	},
	{
		name: 'folder', //process folder entries
		test: (obj, path) =>
			path.length >= 2 && path[path.length - 2] === 'folder' && obj.hasOwnProperty('absFolderPath'),
		process(folder) {
			//default unread to 0 if the key does not exist
			folder.hasOwnProperty('unread') || (folder.unread = 0);
			return folder;
		}
	}
];

/** reduce()-like iteration over nested MIME parts */
function reduceMimeParts(obj, iterator, accumulator) {
	const parts = obj.mimeParts || (obj.mimePart && [obj.mimePart]);

	if (parts && parts.length) {
		for (let i = 0; i < parts.length; i++) {
			accumulator = iterator(parts[i], i, accumulator);
			reduceMimeParts(parts[i], iterator, accumulator);
		}
	}

	return accumulator;
}

/** Normalize a Content-Type to include only `type/subtype`. */
function normalizeType(contentType) {
	return String(contentType)
		.replace(/^\s*(.*?)\s*;.+$/i, '$1')
		.toLowerCase();
}

function normalizeDisposition(contentDisposition) {
	return normalizeType(contentDisposition);
}

export default function zimbraApiClient(config) {
	const api = events();

	let sessionID = 1; //hold the zimbra session ID
	let notifySeq; //hold the last known notification sequence number
	let highestSeq = 0;

	// (optional) jwtToken if using JWT Auth
	let jwtToken = config.jwtToken;

	// queue of changes returned by the server.  They may come out of order
	// so we hold onto them until all outstanding requests are returned and then emit the
	// sorted/consolidated change set in one go
	let queuedChanges = [];
	let outstandingRequests = 0; //number of outstanding api call

	function denest(obj) {
		while (typeof obj === 'object' && obj) {
			if (Array.isArray(obj)) {
				if (obj.length !== 1 || !Array.isArray(obj[0])) {
					break;
				}
				obj = obj[0];
				continue;
			}
			const keys = Object.keys(obj);
			if (keys.length !== 1) {
				return obj;
			}
			// @TODO refactor API serialization and normalization
			// This is a temporary, because this is denesting keys that shouldn't
			// be denested, and this whole serialization layer should be refactored.
			if (keys.length === 1 && includes(DENEST_KEY_BLACKLIST, keys[0])) {
				return obj;
			}
			obj = obj[keys[0]];
		}
		return obj;
	}

	// collapse meta properties onto the Array returned from listings
	function normalizeRoot(obj) {
		const complex = [];

		for (const i in obj) {
			if (obj[i] && typeof obj[i] === 'object') {
				complex.push(i);
			}
		}

		if (complex.length === 1) {
			return Object.assign(obj[complex[0]], obj);
		}

		return obj;
	}

	function depluralize(str) {
		return str.replace(/ies$/, 'y').replace(/s$/, '');
	}

	// Try to parse Zimbra's return format into a developer-friendly JS-native format.
	function normalizeZobj(obj, path) {
		if (typeof obj === 'string') {
			if (obj === 'TRUE' || obj === 'FALSE') return obj === 'TRUE';
			else if (/^\d+$/.test(obj)) return Math.round(obj);
			else if (/^\d*\.\d+$/.test(obj)) return parseFloat(obj);
		}
		path = path || [];
		if (obj && typeof obj === 'object') {
			const out = Array.isArray(obj) ? [] : {};
			for (const i in obj) {
				if (obj.hasOwnProperty(i) && i !== '_jsns') {
					let niceKey = RESPONSE_FIELD_MAP[i] || i;
					for (let j = path.length; j--; ) {
						const map = TYPED_MAPS[path[j]];
						if (map && i in map) {
							niceKey = map[i];
							break;
						}
					}
					// let niceKey = RESPONSE_FIELD_MAP[i] || i;
					out[niceKey] = normalizeZobj(obj[i], path.concat(depluralize(niceKey)));
				}
			}
			obj = denest(out, path);
		}

		if (obj && typeof obj === 'object') {
			for (let i = 0; i < CLASSIFIERS.length; i++) {
				const classifier = CLASSIFIERS[i];
				if (classifier.test(obj, path)) {
					obj = classifier.process(obj, api) || obj;
				}
			}
		}

		return obj;
	}

	// modifies outgoing requests
	function before(req) {
		const event = { req };
		api.emit('req', event);
		outstandingRequests++;

		if (jwtToken) {
			if (!req.headers) {
				req.headers = {};
			}
			req.headers.Authorization = `Bearer ${jwtToken}`;
		}
	}

	// modifies incoming responses
	function after(req, res) {
		//update our session ID from the server
		const resSessionID = get(res, 'data.Header.context.session.id');
		if (resSessionID !== sessionID) {
			sessionID = resSessionID;
			notifySeq = undefined;
			highestSeq = 0;
		}

		//get any changes to data since our last request (e.g. folder unread counts, etc.)
		outstandingRequests--;
		//TODO
		let changes = get(res, 'data.Header.context.notify');
		if (changes) {
			//add the new changes to our existing list of queued changes.
			queuedChanges = queuedChanges.concat(changes);
			changes = changes.forEach(
				({ seq }) => typeof seq !== undefined && seq > (highestSeq || 0) && (highestSeq = seq)
			);
		}
		if (!outstandingRequests) {
			if (highestSeq) notifySeq = highestSeq;
			if (queuedChanges.length) {
				//sort queued changes and emit
				api.emit(
					'change',
					normalizeZobj(queuedChanges.sort((a, b) => (a.seq < b.seq ? -1 : a.seq > b.seq ? 1 : 0)))
				);
				queuedChanges = [];
			}
		}

		let body = get(res, 'data.Body');

		if (body) {
			const keys = Object.keys(body);
			if (keys.length === 1) body = body[keys[0]];
			res.data = normalizeRoot(normalizeZobj(body));
		}

		const event = { req, res };
		api.emit('res', event);
		api.emit('status:' + res.status, event);

		if (((res.status / 100) | 0) >= 4) {
			let msg = `Error ${res.status}`;
			if (res.data && res.data.Code) {
				msg = `${res.data.Code}: ${res.data.Reason}`;
			}
			const err = Error(msg);
			err.request = req;
			err.response = res;
			throw err;
		}
	}

	const Soap = {
		Envelope: 'soap:Envelope',
		Header: 'soap:Header',
		Body: 'soap:Body'
	};
	const ZimbraEnvelope = ({ children }) => (
		<Soap.Envelope {...{ 'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope' }}>
			<Soap.Header>
				<context xmlns="urn:zimbra">
					<userAgent name="zimbra-client" />
					<format type="js" />
				</context>
			</Soap.Header>
			<Soap.Body>{children}</Soap.Body>
		</Soap.Envelope>
	);

	/** Issue a Zimbra SOAP request.
	 *	@public
	 */
	api.soapRequest = (type, body, options) => {
		options = options || {};

		const url = '/service/soap/' + type || options.type;

		const soapBody = `<?xml version="1.0" encoding="UTF-8"?>\n${(
			<ZimbraEnvelope>{body}</ZimbraEnvelope>
		)}`;

		return api.request(url, soapBody, {
			...options,
			headers: {
				...(options.headers || {}),
				'content-type': 'application/soap+xml'
			}
		});
	};

	api.actionRequest = (type, { id, ...rest }) =>
		api.jsonRequest(type, {
			action: {
				...rest,
				id: Array.isArray(id) ? id.join(',') : id
			}
		});

	/**
	 * Given the type, which may be of the form namespace::type, return an array of
	 * the final namespace and type.  Defaut ns is 'mail'.
	 * @return {Array} [ns, type]
	 */
	function getNamespaceAndType(type, options = {}) {
		type = type || options.type;
		return type && type.match(/::/) ? type.split('::') : [options.ns || 'mail', type];
	}

	function prepareJsonBody(ns, body) {
		return {
			_jsns: `urn:zimbra${ns && ns[0].toUpperCase()}${ns && ns.substring(1)}`,
			...(body || {})
		};
	}

	/** JSON request */
	api.jsonRequest = (type, body, options) => {
		options = options || {};
		let ns;
		[ns, type] = getNamespaceAndType(type, options);

		const contextHeader = {
			context: {
				_jsns: 'urn:zimbra',
				session: { id: sessionID, _content: sessionID } //add the session to the header so we get change notifications
			}
		};
		if (typeof notifySeq !== 'undefined') contextHeader.notify = { seq: notifySeq }; //send the last seen notification sequence number

		const jsonBody = {
			Header: Object.assign({}, options.header, contextHeader),
			Body: {
				[type]: prepareJsonBody(ns, body)
			}
		};

		const url = '/service/soap/' + type || options.type;
		return api.request(url, jsonBody, {
			...options,
			headers: {
				...(options.headers || {}),
				'content-type': 'application/soap+xml'
			}
		});
	};

	//takes an array where each entry is an object that can be passed to jsonRequest as its arguments
	// e.g. [ [type, body, options], [type, body, options], ...]
	api.batchJsonRequest = jsonRequests => {
		const batchBody = {};
		//Create one key for each type of request. If there are multiple request of the same type,
		//then the body of that key will be an array of the different bodies for that request type
		jsonRequests.forEach(([type, body, requestOptions]) => {
			let ns;
			[ns, type] = getNamespaceAndType(type, requestOptions);
			let jsonBody = prepareJsonBody(ns, body);
			if (batchBody[type]) {
				jsonBody = Array.isArray(batchBody[type])
					? [...batchBody[type], jsonBody]
					: [batchBody[type], jsonBody];
			}
			Object.assign(batchBody, { [type]: jsonBody });
		});
		return api.jsonRequest('::BatchRequest', batchBody).then(response => {
			const requestKeys = Object.keys(batchBody);

			// Single, regular, request.
			if (requestKeys.length === 1) {
				return response;
			}

			// Otherwise we flatten results into the same order as they were
			// requested.
			return flatten(values(response));
		});
	};

	/** Issue a Zimbra HTTP request
	 *	@public
	 */
	api.request = apiRequest(config.url || config.origin, before, after);

	/** Resolve a URI to a resource
	 *  @public
	 */
	api.resolve = uri => `${config.url || config.origin || ''}${uri}`;

	// api.noopRequest = () => api.request('/service/soap/NoOpRequest', {
	// 	Body: { NoOpRequest: { _jsns: 'urn:zimbraMail' } }
	// });
	api.noopRequest = () => api.jsonRequest('NoOpRequest');

	//change listener handlers
	api.addChangeListener = func => api.on('change', func);
	api.removeChangeListener = func => api.off('change', func);

	api.setJwtToken = token => {
		jwtToken = token;
	};

	api.getJwtToken = () => jwtToken;

	return api;
}
