export const SMIME_EMAIL_STATUS = {
	signed: 'signed',
	wasSigned: 'was-signed',
	untrusted: 'untrusted',
	corrupt: 'corrupt',
	revoked: 'revoked',
	expired: 'expired',
	wrongSigner: 'wrong-signer',
	unapprovedAlgorithm: 'unapproved-algorithm',
	unknown: 'unknown',
	error: 'error',
	invalid: 'invalid',
	encryptOnly: 'encrypt-only'
};

export const SMIME_OPERATIONS = {
	rememberSettings: 'rememberSettings',
	noSignOrEnc: 'noSignOrEnc',
	sign: 'sign',
	signAndEnc: 'signAndEnc'
};

export const SMIME_ICONS = {
	noSignOrEnc: 'not-signed',
	sign: 'signed',
	signAndEnc: 'encrypted'
};

export const CERT_FILE_MIME_TYPE = 'application/x-x509-ca-cert';

export const CERT_FILE_READ_STATUS = {
	INVALID_FILE: 1,
	INVALID_CERT: 2,
	CORRUPTED: 3,
	EMAIL_ADDRESS_MISSING: 4
};
