export const FOLDER_NAME_CHAR_LIMIT = 128;

export const LOCAL_FOLDER_ABSFOLDERPATH_PREFIX = '/localFolder/';

export const INVALID_FOLDER_NAME_ERRORS = {
	INVALID_NAME: 'invalidNameWarning',
	SPECIAL_CHAR_WARNING: 'specialCharWarning',
	LOCAL_FOLDER_SPECIAL_CHAR_WARNING: 'localSpecialCharWarning',
	LENGTH_EXCEED_WARNING: 'lengthExceedWarning'
};

export function getFolderNameValidationStatus(name, isLocalFolder = false) {
	const status = {
		isValid: true
	};
	const validateCharacter = isLocalFolder ? !name.match(/^[A-Za-z0-9_\s]+$/) : name.match(/[:"/]/);
	if (!name.trim().length) {
		status.isValid = false;
		status.notifyMessageID = INVALID_FOLDER_NAME_ERRORS.INVALID_NAME;
	} else if (validateCharacter) {
		status.isValid = false;
		status.notifyMessageID = isLocalFolder
			? INVALID_FOLDER_NAME_ERRORS.LOCAL_FOLDER_SPECIAL_CHAR_WARNING
			: INVALID_FOLDER_NAME_ERRORS.SPECIAL_CHAR_WARNING;
	} else if (name.length > FOLDER_NAME_CHAR_LIMIT) {
		status.isValid = false;
		status.notifyMessageID = INVALID_FOLDER_NAME_ERRORS.LENGTH_EXCEED_WARNING;
	}

	return status;
}
