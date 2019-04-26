import ports from '../constants/ports';

export default function mailPort(type, useSSL) {
	return type === 'pop3'
		? useSSL
			? ports.pop3.crypt
			: ports.pop3.nocrypt
		: useSSL
		? ports.imap.crypt
		: ports.imap.nocrypt;
}
