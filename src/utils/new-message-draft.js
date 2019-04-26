export default function newMessageDraft() {
	return {
		attachments: [],
		bcc: [],
		cc: [],
		flags: 'd',
		replyType: 'w',
		subject: '',
		to: [],
		from: [],
		sender: []
	};
}
