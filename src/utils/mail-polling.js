import {
	MINUTES_TO_SECONDS,
	HOURS_TO_SECONDS,
	DAYS_TO_SECONDS,
	MILLISECONDS_MULTIPLIER
} from '../constants/mail-polling';

export function convertToMilliseconds(time) {
	return convertToSeconds(time) * MILLISECONDS_MULTIPLIER;
}

export function convertToSeconds(time) {
	// For each type of time format (that server returns), convert to seconds appropriately.
	if (time.indexOf('d') > -1) {
		return parseInt(time, 10) * DAYS_TO_SECONDS;
	} else if (time.indexOf('h') > -1) {
		return parseInt(time, 10) * HOURS_TO_SECONDS;
	} else if (time.indexOf('ms') > -1) {
		return parseInt(time, 10) / MILLISECONDS_MULTIPLIER;
	} else if (time.indexOf('m') > -1) {
		return parseInt(time, 10) * MINUTES_TO_SECONDS;
	}

	return parseInt(time, 10);
}
