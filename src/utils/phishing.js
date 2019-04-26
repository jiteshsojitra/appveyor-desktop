import { containsValidEmail } from '../lib/util';
import memoize from 'lodash-es/memoize';

export const isPossiblySpoofedAddress = memoize(
	({ email, name }) => {
		// An email containing two @ signs is spoofed.
		if (email) {
			email = email.indexOf('@') !== email.lastIndexOf('@');
		}

		// A display name that contains an email address is spoofed.
		if (name) {
			name = name.indexOf('@') !== 0 && containsValidEmail(name);
		}

		return email || name;
	},
	({ email, name }) => `${email}__${name}`
);
