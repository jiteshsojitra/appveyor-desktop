import get from 'lodash/get';

export function isAlreadyExistsError(e) {
	return e && /exists/.test(e.message);
}

export function errorMessage(error) {
	return get(error, 'graphQLErrors.0.originalError.message') || error.message || error;
}

export function faultCode(error) {
	return get(error, 'graphQLErrors.0.originalError.faults.0.Detail.Error.Code');
}
