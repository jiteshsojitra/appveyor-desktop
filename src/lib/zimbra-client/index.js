/*****
 ****
 ***
 **
 *
 * DEPRECATED: The zimbra-client is deprecated, please do not add to it.
 * This library has been replaced by https://github.com/Zimbra/zm-api-js-client
 * New features should be added to zm-api-js-client.
 * Existing code consuming this library should be moved to zm-api-js-client.
 *
 **
 ***
 ****
 *****/
import mapValues from 'lodash-es/mapValues';
import zimbraApiClient, { normalizeToZimbra } from './api-client';
import { USER_ROOT_FOLDER_ID } from '../../constants';
import { partitionTagsAndFilename, getTagFromQuery } from '../query-builder';
import { hasCommonSubstr, isValidEmail, isSameOrigin } from '../util';
import array from '@zimbra/util/src/array';
import { isImage, isInline, isHiddenAttachmentType } from '../../utils/attachments';

import reject from 'lodash-es/reject';
import isEmpty from 'lodash-es/isEmpty';
import differenceWith from 'lodash-es/differenceWith';

/*****
 ****
 ***
 **
 *
 * DEPRECATED: The zimbra-client is deprecated, please do not add to it.
 * This library has been replaced by https://github.com/Zimbra/zm-api-js-client
 * New features should be added to zm-api-js-client.
 * Existing code consuming this library should be moved to zm-api-js-client.
 *
 **
 ***
 ****
 *****/
export default function zimbraClient(config) {
	const api = zimbraApiClient(config);

	api.checkSession = () => api.noopRequest().then(Boolean, () => false);

	api.attachment = {
		upload(file, options = {}) {
			return api
				.request('/service/upload?fmt=extended,raw', file, {
					method: 'POST',
					headers: {
						'Content-Disposition': `${options.disposition || 'inline'}; filename="${
							options.filename
						}"`,
						'Content-Type': options.contentType || 'application/octet-stream'
					}
				})
				.then(res => RegExp(/"aid":"([^"]*)"/).exec(res)[1]);
		}
	};

	api.account = {
		modifyIdentity: (id, attrs) =>
			api.jsonRequest('account::ModifyIdentityRequest', {
				identity: {
					id,
					_attrs: mapValues(attrs, coerceBoolean)
				}
			})
	};

	api.search = function({ headers, fetch = false, limit, types, full, ...rest }) {
		return api.jsonRequest('SearchRequest', {
			header: headers && headers.map(n => ({ n })),
			fetch: fetch === true ? 'all' : fetch | 0,
			limit: limit || 10,
			types: String(types || 'message'),
			fullConversation: full === false ? 0 : 1,
			needExp: true,
			...rest
		});
	};

	api.searchRequest = options => api.jsonRequest('SearchRequest', options);

	api.searchGal = ({ name, type = 'account', offset = 0, limit = 3 }) =>
		api
			.jsonRequest('account::SearchGalRequest', {
				name,
				type,
				offset,
				limit
			})
			.then(ensureArray);

	api.folders = {
		list(options = {}) {
			let folder;
			const { depth, view, baseFolderUUID, baseFolderId, path } = options;

			if (baseFolderUUID || baseFolderId || path) {
				folder = { uuid: baseFolderUUID, l: baseFolderId, path, view, depth };
			}

			return api.jsonRequest('GetFolderRequest', { folder, view, depth }).then(data => {
				if (options.root === false) return data.folder;
				return ensureArray(data);
			});
		},

		read({ folder = 'Inbox', query, types, ...options } = {}) {
			let before = Promise.resolve();
			if (!types) {
				before = api.folders.list({ path: folder }).then(([folderInfo]) => {
					types = folderInfo.view;
				});
			}

			//do some faking to make sort by unread work until the backend supports it
			const isSortByUnread = options && options.sortBy === 'unread';
			if (isSortByUnread) {
				delete options.sortBy; //use default sort
				return before
					.then(() =>
						api.search({
							...options,
							query: query ? `${query} is:unread` : `in:"${folder}" is:unread`,
							types: types || 'conversation'
						})
					)
					.then(ensureArray)
					.then(res => {
						if (res && res.sortBy) {
							res.sortBy = 'unread';
						}
						return res;
					});
			}

			return before
				.then(() =>
					api.search({
						...options,
						query: query || `in:"${folder}"`,
						types: types || 'conversation'
					})
				)
				.then(ensureArray);
		},

		create({ parentFolderId = 1, color, name, url, view, flags, fetchIfExists, sync = 1 }) {
			api.folders.clearIdMapping();
			return api.jsonRequest('CreateFolderRequest', {
				folder: {
					l: parentFolderId,
					name,
					url,
					view,
					fie: fetchIfExists,
					color,
					f: flags,
					sync
				}
			});
		},

		// Move folder to trash folder
		trash(id) {
			api.folders.clearIdMapping();
			return api.jsonRequest('FolderActionRequest', {
				action: {
					op: 'trash',
					id: idField(id)
				}
			});
		},

		// Permanently delete folder from folder tree
		delete(id) {
			api.folders.clearIdMapping();
			return api.jsonRequest('FolderActionRequest', {
				action: {
					op: 'delete',
					id: idField(id)
				}
			});
		},

		markRead: id =>
			api.actionRequest('FolderActionRequest', {
				id: idField(id),
				op: 'read'
			}),

		changeColor: ({ id, color }) =>
			api.actionRequest('FolderActionRequest', {
				id: idField(id),
				op: 'color',
				color
			}),

		empty: (id, options = {}) =>
			api.actionRequest('FolderActionRequest', {
				recursive: true,
				op: 'empty',
				...options,
				id: idField(id)
			}),

		getIdMapping() {
			const self = api.folders.getIdMapping;
			return (
				self.cached ||
				(self.cached = api.folders.list().then(data => {
					function reduce(acc, folder) {
						acc[folder.id] = folder.absFolderPath.substring(1);
						if (folder.folder) folder.folder.reduce(reduce, acc);
						return acc;
					}
					return reduce({}, data);
				}))
			);
		},

		clearIdMapping() {
			api.folders.getIdMapping.cached = null;
		},

		rename: (id, name) =>
			api.actionRequest('FolderActionRequest', {
				id: idField(id),
				name,
				op: 'rename'
			}),

		/**
		 * Move a folder to another folder. If a destination folder is not
		 * provided, move to the root.
		 */
		move: ({ id, destFolderId }) =>
			api.actionRequest('FolderActionRequest', {
				id: idField(id),
				l: destFolderId || USER_ROOT_FOLDER_ID,
				op: 'move'
			})
	};

	api.tags = {
		list: () => api.jsonRequest('GetTagRequest').then(ensureArray),

		// tags.create({ name:'Foo', color:3 })
		create: tag => api.jsonRequest('CreateTagRequest', { tag }),

		// tags.delete(33401)
		delete: id =>
			api.jsonRequest('TagActionRequest', {
				action: {
					op: 'delete',
					id: idField(id)
				}
			})
	};

	api.notes = {
		list: ({ id, ...rest }) =>
			api.folders.read({
				limit: 500,
				...rest,
				query: `inid:${idField(id)}`,
				types: 'note'
			}),

		create({ parentFolderId, subject, body }) {
			return api.jsonRequest('CreateNoteRequest', {
				note: {
					l: idField(parentFolderId),
					content: JSON.stringify({
						subject,
						body
					})
				}
			});
		},

		read(id) {
			return typeof id !== undefined
				? api.jsonRequest('GetNoteRequest', {
						note: {
							id
						}
				  })
				: Promise.resolve();
		},

		// @TODO should probably be `update(id, { subject, body })` to match other methods.
		update({ id, subject, body }) {
			return typeof id !== undefined
				? api.jsonRequest('NoteActionRequest', {
						action: {
							id: idField(id),
							op: 'edit',
							content: JSON.stringify({ subject, body })
						}
				  })
				: Promise.reject('id is requried');
		},

		delete(id) {
			return api.jsonRequest('NoteActionRequest', {
				action: {
					id: idField(id),
					op: 'delete'
				}
			});
		},

		move(id, parentFolderId) {
			return api.jsonRequest('NoteActionRequest', {
				action: {
					id: idField(id),
					op: 'move',
					l: idField(parentFolderId)
				}
			});
		}
	};

	api.conversations = {
		list: (options = {}) =>
			api.folders
				.read({
					recip: 2,
					...options,
					types: 'conversation'
				})
				.then(ensureArray),

		/**
		 *	@example
		 *	read('-30716', {
		 *		headers: ['List-ID', 'X-Zimbra-DL', 'IN-REPLY-TO']
		 *		read: true	// mark any expanded as read
		 *	})
		 */
		read: (id, options = {}) =>
			api.jsonRequest('GetConvRequest', {
				c: {
					id: idField(id),
					fetch:
						options.fetch === false ? 0 : typeof options.fetch === 'number' ? options.fetch : 'all',
					html: options.html !== false && options.text !== true ? 1 : 0,
					header: options.headers && options.headers.map(n => ({ n })),
					needExp: true,
					max: options.max || 250000
				}
			}),
		// read: (id, options={}) => api.jsonRequest('SearchConvRequest', {
		// 	cid: id,
		// 	fetch: options.fetch || 0,
		// 	html: options.html!==false && options.text!==true ? 1 : 0,
		// 	header: options.headers && options.headers.map( n => ({ n }) ),
		// 	// @TODO what are these?
		// 	needExp: true,
		// 	max: options.max || 250000
		// })

		markRead: (id, value) =>
			api.actionRequest('ConvActionRequest', {
				id: idField(id),
				op: value ? 'read' : '!read'
			}),
		flag: (id, value) =>
			api.actionRequest('ConvActionRequest', {
				id: idField(id),
				op: value ? 'flag' : '!flag'
			}),
		trash: id => api.actionRequest('ConvActionRequest', { id: idField(id), op: 'trash' }),
		spam: (id, value) =>
			api.actionRequest('ConvActionRequest', {
				id: idField(id),
				op: value ? 'spam' : '!spam'
			}),
		move: (id, destFolderId) =>
			api.actionRequest('ConvActionRequest', {
				id: idField(id),
				l: destFolderId,
				op: 'move',
				tcon: '-ds' // not in Drafts or Sent
			})
	};

	api.messages = {
		list: (options = {}) => api.folders.read({ ...options, types: 'message' }).then(ensureArray),

		/**
		 *	@example
		 *	read('30627', {
		 *		headers: ['List-ID', 'X-Zimbra-DL', 'IN-REPLY-TO']
		 *	})
		 */
		read: (id, options = {}) =>
			api.jsonRequest('GetMsgRequest', {
				m: {
					id: idField(id),
					html: options.html !== false && options.text !== true && options.raw !== true ? 1 : 0,
					header: options.headers && options.headers.map(n => ({ n })),
					read: options.read === true ? 1 : undefined,
					// expand available expansions
					needExp: true,
					neuter: 0,
					// max body length (look for mp.truncated=1)
					max: options.max || 250000,
					raw: options.raw ? 1 : 0
				}
			}),

		flag: (id, value) =>
			api.actionRequest('MsgActionRequest', {
				id: idField(id),
				op: value ? 'flag' : '!flag'
			}),

		markRead: (id, value) =>
			api.actionRequest('MsgActionRequest', {
				id: idField(id),
				op: value ? 'read' : '!read'
			}),

		trash: id => api.actionRequest('MsgActionRequest', { id: idField(id), op: 'trash' }),

		spam: (id, value) =>
			api.actionRequest('MsgActionRequest', {
				id: idField(id),
				op: value ? 'spam' : '!spam'
			}),

		move: (id, destFolderId) =>
			api.actionRequest('MsgActionRequest', {
				id: idField(id),
				l: destFolderId,
				op: 'move',
				tcon: '-ds' // not in Drafts or Sent
			}),

		send(message) {
			const params = { m: convertMessageToZimbra(message) };
			return api.jsonRequest('SendMsgRequest', params);
		},

		attach(files, { ...message }) {
			return Promise.all(
				array(files).map(file => {
					const contentDisposition = isInline(file) ? 'inline' : 'attachment';
					let before = Promise.resolve(file);

					if (file.messageId && file.part) {
						// short path: this file is an attachment from a different message, directly add it as an attachment.
						return Promise.resolve(file);
					}

					// If the file is not a real file, fetch it to convert it to a Blob.
					if ((!(file instanceof File) || !(file instanceof Blob)) && file.url) {
						before = fetch(
							file.url,
							isSameOrigin(file.url) ? { credentials: 'include' } : undefined
						).then(r => (r.ok ? r.blob() : Promise.reject(r.status)));
					}

					return before.then(data =>
						api
							.request('/service/upload?fmt=extended,raw', data, {
								method: 'POST',
								headers: {
									'Content-Disposition': `${contentDisposition}; filename="${file.filename ||
										file.name ||
										data.filename ||
										data.name}"`,
									'Content-Type': data.type || data.contentType || 'application/octet-stream'
								}
							})
							.then(result => {
								if (!result) {
									return Promise.reject(Error('Empty result after uploading attachment'));
								}

								const [, status, err, json] = result.match(/^([^,]+),([^,]+),(.*)/) || [];

								if (err && err !== `'null'`) {
									return Promise.reject(err);
								}

								if (+status === 200) {
									return JSON.parse(json)[0];
								}

								return Promise.reject(Error('Bad Response Status: ' + status));
							})
							.catch(e => {
								console.error('Upload ERR: Could not parse JSON', e);
								return Promise.reject(e);
							})
					);
				})
			).then(attached => {
				// After all uploads have completed, add attachments to the message and save it as a draft.
				attached.forEach((attachment, index) => {
					if (attachment) {
						const file = files[index];

						const fileAttributes = {
							filename: file.name || file.filename,
							contentType: file.type || file.contentType,
							size: file.size,
							contentId: file.contentId,
							contentDisposition: file.contentDisposition,
							attachmentId: attachment.aid,
							...(attachment.url && { url: attachment.url }),
							...(attachment.part && { part: attachment.part }),
							...(attachment.messageId && { messageId: attachment.messageId })
						};

						if (isInline(file)) {
							message.inlineAttachments = [...(message.inlineAttachments || []), ...fileAttributes];
						} else if (!attachment.aid) {
							// Existing attachments have no attachmentId, just push it onto the message
							message.attachments = [...(message.attachments || []), attachment];
						} else {
							// New attachments have an attachmentId, pass them on as CSV
							message.attachments = [...(message.attachments || []), ...fileAttributes];

							message.attach = message.attach || {};
							message.attach.attachmentId = message.attach.attachmentId
								? `${message.attach.attachmentId},${attachment.aid}`
								: attachment.aid;
						}
					}
				});

				// return api.drafts[message.draftId ? 'update' : 'create'](message);

				message.uploadingFileList = differenceWith(
					message.uploadingFileList,
					attached,
					(fileFromList, fileFromAttachment) =>
						(fileFromList.name || fileFromList.filename) === fileFromAttachment.filename
				);

				return message;
			});
		}
	};

	api.drafts = {
		create(message) {
			const params = { m: convertMessageToZimbra(message) };
			return api.jsonRequest('SaveDraftRequest', params);
		},
		update(message) {
			const params = {
				m: {
					...convertMessageToZimbra(message),
					id: idField(message.draftId)
				}
			};

			return api.jsonRequest('SaveDraftRequest', params);
		},
		delete(id) {
			return api.actionRequest('MsgActionRequest', {
				id: idField(id),
				op: 'delete'
			});
		}
	};

	api.appointments = {
		list(options = {}) {
			return api
				.jsonRequest('SearchRequest', {
					types: 'appointment',
					calExpandInstStart: options.start,
					calExpandInstEnd: options.end || options.start + 2678400000, // 31 days
					query: options.folderIds
						? {
								_content: options.folderIds.map(id => `inid:"${id}"`).join(' OR ')
						  }
						: undefined,
					offset: options.offset || 0,
					limit: options.limit || 50
				})
				.then(options.flatten ? flattenEvents : Object)
				.then(ensureArray);
		}
	};

	api.calendars = {
		check: ({ calendarId, value }) =>
			api.jsonRequest('FolderActionRequest', {
				action: { op: value ? 'check' : '!check', id: calendarId }
			}),
		import: (fileData, calendarPathName, format, username) =>
			api.request(`/home/${username}/${calendarPathName}?fmt=${format}`, fileData, {
				method: 'POST',
				'content-type': 'text/calendar'
			}),
		export: (calendarName, username) => api.request(`/home/${username}/${calendarName}?fmt=ics`)
	};

	api.meetings = {
		sendInviteReply: ({ ...message }, options = {}) => {
			if (options.updateOrganizer !== false) {
				// Swap the receiver with the organizer to notify the organizer.
				[message.from, message.to] = [message.to, message.from];

				// Change the message to reply mode.
				message.replyType = 'r';
			}

			delete message.attachments;

			// Use one of these verbs: [ "ACCEPT", "DECLINE", "TENTATIVE" ] }
			return api.jsonRequest('SendInviteReplyRequest', {
				compNum: 0, // TODO: Support multi-component invites
				id: String(message.id),
				...options,
				updateOrganizer: options.updateOrganizer === false ? 'FALSE' : 'TRUE',
				m: convertMessageToZimbra(message)
			});
		},
		accept: (message, options = {}) =>
			api.meetings.sendInviteReply(message, { ...options, verb: 'ACCEPT' }),
		decline: (message, options = {}) =>
			api.meetings.sendInviteReply(message, { ...options, verb: 'DECLINE' }),
		tentative: (message, options = {}) =>
			api.meetings.sendInviteReply(message, { ...options, verb: 'TENTATIVE' })
	};

	api.tasks = {
		trash: ({ inviteId }) =>
			api.jsonRequest('CancelTaskRequest', {
				comp: '0',
				id: inviteId
			}),

		delete: ({ inviteId }) =>
			api.jsonRequest('ItemActionRequest', {
				action: {
					op: 'delete',
					id: inviteId
				}
			}),

		move: ({ inviteId, destFolderId }) =>
			api.jsonRequest('ItemActionRequest', {
				action: {
					op: 'move',
					id: inviteId,
					l: idField(destFolderId)
				}
			})

		//read: - use messages.read instead - it is more consistent with the other task apis for shape of the response
	};

	api.contacts = {
		/** Import contacts from a serialized format.
		 *	@param {String} data		Data to import
		 *	@param {Object} [options]
		 *	@param {Object} [options.folder]	      The name of the folder to import contacts into
		 *	@param {Object} [options.format='csv']	Format of the data being imported (csv or vcf).
		 */
		import(data, { format = 'csv', folder } = {}) {
			return api.request(
				`/service/home/~/contacts${folder ? `/${folder}` : ''}?fmt=${format}`,
				data
			);
		},

		/** Export contacts to a serialized downloadable format.
		 *	@param {Object} options
		 *	@param {String} [options.format='csv']	One of: zimbra-csv, yahoo-csv, thunderbird-csv, outlook-2003-csv
		 */
		export({ format = 'outlook-2003-csv' } = {}) {
			return api.jsonRequest('ExportContactsRequest', {
				ct: 'csv',
				csvfmt: format
			});
		},

		getExportUrl({ format = 'csv', csvFormat }) {
			return api.resolve(
				`/service/home/~/contacts?fmt=${format}${csvFormat ? `&csvfmt=${csvFormat}` : ''}`
			);
		},

		getRestorePoints() {
			return api.jsonRequest('GetContactBackupListRequest').then(files =>
				!files || !files.length
					? []
					: files.map((file, index) => ({
							id: index,
							name: file
					  }))
			);
		},

		restoreSnapshot(file) {
			return api.jsonRequest('RestoreContactsRequest', {
				contactsBackupFileName: file
			});
		},

		getVcf(id) {
			return api.request(`/home/~/contacts?fmt=txt&charset=UTF-8&id=${id}`);
		}
	};

	api.attachments = {
		getUrl(attachment) {
			const jwtToken = api.getJwtToken();
			const { messageId, mid, part } = attachment;
			return api.resolve(
				`/service/home/~/?auth=${jwtToken ? 'jwt' : 'co'}&id=${encodeURIComponent(
					messageId || mid
				)}&part=${encodeURIComponent(part)}${jwtToken ? `&zjwt=${jwtToken}` : ''}`
			);
		},
		list({ query, offset = 0, ...rest }) {
			return api
				.search({
					query: query || 'has:attachment',
					offset,
					fetch: true,
					...rest
				})
				.then(
					({ messages, ...results } = {}) =>
						results && {
							...results,
							attachments:
								messages && messages.length
									? messages.reduce(
											(acc, message) =>
												acc.concat(
													[
														...(message.attachments || []),
														...(message.inlineAttachments || [])
													].map(attachment => ({
														...attachment,
														part: attachment.part.toString(),
														sentDate: message.sentDate,
														from: message.from
													}))
												),
											[]
									  )
									: []
						}
				);
		},
		files({ searchTerm, offset = 0, ...rest }) {
			if (searchTerm) {
				searchTerm = partitionTagsAndFilename(searchTerm);
			}
			const filename = getTagFromQuery('filename', searchTerm);

			return api.attachments
				.list({
					query: searchTerm,
					offset,
					...rest
				})
				.then(
					({ attachments, ...results }) =>
						results && {
							...results,
							attachments:
								attachments &&
								attachments.filter(
									attachment =>
										!isImage(attachment) &&
										!isHiddenAttachmentType(attachment) &&
										(filename ? hasCommonSubstr(filename, attachment.filename) : true)
								)
						}
				);
		},
		images({ searchTerm, offset = 0, ...rest }) {
			if (searchTerm) {
				searchTerm = partitionTagsAndFilename(searchTerm);
			}
			const filename = getTagFromQuery('filename', searchTerm);

			return api.attachments
				.list({
					query: searchTerm,
					fetch: true,
					offset,
					...rest
				})
				.then(
					({ attachments, ...results }) =>
						results && {
							...results,
							attachments:
								attachments &&
								attachments.filter(
									attachment =>
										isImage(attachment) &&
										(filename ? hasCommonSubstr(filename, attachment.filename) : true)
								)
						}
				);
		}
	};

	const SEEN_IMAGES = [];
	const PRELOADING = {};

	const getUrl = url => (typeof url === 'object' ? url.url : url);

	api.images = {
		isPreloaded: resource => SEEN_IMAGES.indexOf(getUrl(resource)) !== -1,

		isPreloading: resource => PRELOADING[getUrl(resource)] !== undefined,

		preload(resource, callback) {
			const url = getUrl(resource);
			let promise;

			if (typeof callback !== 'function') {
				promise = PRELOADING[url] || new Promise(r => (callback = r));
			}
			if (!url || url === '' || SEEN_IMAGES.indexOf(url) > -1) {
				if (promise && PRELOADING[url]) return PRELOADING[url];
				callback();
			} else {
				const img = new Image();
				let sync = true,
					loaded;
				img.onload = img.onerror = () => {
					loaded = true;
					SEEN_IMAGES.push(url);
					if (!sync) {
						api.emit('res', { url });
						callback();
					}
				};
				img.src = url;
				sync = false;
				if (loaded) callback();
				else api.emit('req', { url: img.src });
			}
			return promise;
		}
	};

	api.linkEnhancer = function(url) {
		return fetch(
			`https://api.linkpreview.net/?key=5a0e2be54fcbb99b07ce94a935e5a5f9e8a31297d3140&q=${url}`
		)
			.then(resp => (resp.ok ? resp.json() : Promise.reject(resp.status)))
			.then(obj => ({
				...obj,
				// TODO: Implement favicon and domainStyles somehow?
				favicon: {},
				domainStyles: {
					logo: '',
					color: '#000000'
				}
			}));
	};

	api.share = {
		getInfo: address =>
			api
				.jsonRequest(
					'GetShareInfoRequest',
					{
						includeSelf: 0,
						owner: {
							by: 'name',
							_content: address
						}
					},
					{
						ns: 'account'
					}
				)
				.then(shares => reject([].concat(shares || []), isEmpty))
	};

	return api;
}

/** Flattens all instances of each event as events with a single instance.
 *	The original event can be accessed as .originalEvent
 *	@private
 */
function flattenEvents(events) {
	const instances = [];
	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		for (let j = 0; j < event.instances.length; j++) {
			const instance = event.instances[j];
			instances.push({
				originalEvent: event,
				...event,
				instances: [instance],
				instance
			});
		}
	}
	return instances;
}

function collapseAddresses(list, type) {
	if (!list) {
		return [];
	}
	const out = [];
	for (let i = 0; i < list.length; i++) {
		const sender = list[i];

		// Skip invalid senders.
		if (isValidEmail(sender.email || sender.address)) {
			out.push({
				address: sender.email || sender.address,
				name: sender.name,
				shortName: sender.shortName || sender.firstName,
				type: type[0] // @TODO verify this is t/f/b/c
			});
		}
	}
	return out;
}

function formatAttachment({ ...attachment }, contentDisposition = 'attachment') {
	const { contentId, attachmentId } = attachment;
	const messageId = attachment.messageId || attachment.draftId;

	if (attachmentId) {
		return {
			contentDisposition,
			contentId,
			attach: { attachmentId }
		};
	}

	if (messageId) {
		return {
			contentId,
			attach: {
				mimeParts: [
					{
						messageId,
						part: attachment.part
					}
				]
			}
		};
	}

	// never send locally resolved url
	delete attachment.url;
	delete attachment.messageId;
	delete attachment.contentId;
	delete attachment.attachmentId;

	return {
		...attachment,
		contentDisposition
	};
}

/**
 * Given a message output by the Composer component, create a message
 * compatible with the Zimbra SOAP API
 */
function convertMessageToZimbra(message) {
	const {
		id,
		inReplyTo,
		entityId,
		from,
		to,
		cc,
		bcc,
		subject,
		text,
		html,
		flag,
		origId,
		draftId,
		replyType,
		attach, // Used to attach a new attachment.
		attachments,
		inlineAttachments,
		autoSendTime
	} = message;

	const out = {
		id,
		origId,
		draftId,
		replyType,
		irt: inReplyTo,
		entityId,
		subject,
		flag,
		autoSendTime,
		senders: [
			...collapseAddresses(to, 'to'),
			...collapseAddresses(cc, 'cc'),
			...collapseAddresses(bcc, 'bcc'),
			...collapseAddresses(from, 'from')
		]
	};

	const mimeParts = [];

	const textPart = {
		contentType: 'text/plain',
		content: {
			_content: text || ''
		}
	};

	const htmlPart = {
		contentType: 'text/html',
		content: {
			_content: html || ''
		}
	};

	if (html && text) {
		// if we have HTML, put the `text` & `html` parts into an `alternative` part
		// with the text part first but the html part flagged as body.
		htmlPart.body = true;

		mimeParts.push({
			contentType: 'multipart/alternative',
			mimeParts: [textPart, htmlPart]
		});
	} else {
		// otherwise there is no need for a `related` part, we just drop `text`
		// into `alternative` or `mixed` (depending if there are attachments).
		const part = html ? htmlPart : textPart;
		part.body = true;
		mimeParts.push(part);
	}

	// If there are inline attachments; then create a `multipart/related` part
	// and append the `text/html` part and all inline attachment mimeParts to it.
	if (
		inlineAttachments &&
		inlineAttachments.length &&
		mimeParts[0] &&
		mimeParts[0].mimeParts[1] === htmlPart
	) {
		mimeParts[0].mimeParts[1] = {
			contentType: 'multipart/related',
			mimeParts: [
				htmlPart,
				...inlineAttachments.map(attachment => formatAttachment(attachment, 'inline'))
			]
		};
	}

	out.mimeParts = mimeParts;

	if (attach) {
		out.attach = attach;
	}

	if (attachments && attachments.length) {
		if (!out.attach) {
			out.attach = {};
		}

		out.attach.mimeParts = attachments.map(({ part, messageId }) => ({
			part,
			messageId: messageId || id
		}));
	}

	return normalizeToZimbra(out);
}

// Ensure results listing is a real Array, and not an Object (commonly returned for empty result sets).
function ensureArray(data) {
	if (data && !Array.isArray(data)) {
		data = Object.assign([], data);
	}
	return data;
}

// Normalizes one or more IDs or objects with IDs into a CSV of IDs.
export function idField(id) {
	return Array.isArray(id) ? id.map(idField).join(',') : String((id && id.id) || id || '');
}

function coerceBoolean(val) {
	if (val === true) {
		return 'TRUE';
	}
	if (val === false) {
		return 'FALSE';
	}
	return val;
}
