export const JWT_TOKEN_STORAGE_KEY = 'jwtToken';

/**
 * A singleton interface for getting/setting the jwtToken.
 */
export default {
	get() {
		const jwtToken = localStorage.getItem(JWT_TOKEN_STORAGE_KEY);
		return shouldUseJwtToken(jwtToken) ? jwtToken : null;
	},
	set(jwtToken) {
		localStorage.setItem(JWT_TOKEN_STORAGE_KEY, jwtToken);
	},
	clear() {
		localStorage.removeItem(JWT_TOKEN_STORAGE_KEY);
	}
};

/**
 * Given a JWT, return a decoded JWT.
 * @param {String} jwtToken         A JWT token
 * @returns {(Object|String)[]}     Returns an array containing the 3 parts of the jwt in order: header, payload, and signature.
 */
export function decodeJwt(jwtToken) {
	return jwtToken && jwtToken.length && jwtToken.split
		? jwtToken.split('.').map((token, index) => (index < 2 ? JSON.parse(atob(token)) : token))
		: [];
}

// A jwtToken should be used by the app if it is within a valid time range.
export function shouldUseJwtToken(jwtToken) {
	const [, payload] = decodeJwt(jwtToken);
	return payload && !isJwtExpired(payload) && !isJwtInvalidBeforeNow(payload);
}

export function isJwtExpired(payload) {
	return payload.exp && Number(String(payload.exp) + '000') < Date.now();
}

export function isJwtInvalidBeforeNow(payload) {
	return payload.nbf && Number(String(payload.nbf) + '000') > Date.now();
}
