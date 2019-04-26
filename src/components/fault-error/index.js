import { h } from 'preact';
import { Text, Localizer } from 'preact-i18n';
import last from 'lodash/last';
import { faultCode, errorMessage } from '../../utils/errors';

/**
 * Display a localized Zimbra GraphQL SOAP Fault error, or fallback
 * to the error message if not localized.
 */
const FaultError = ({ error }) => {
	const fault = faultCode(error);
	return fault ? (
		<Localizer>
			<Text id={`faults.${last(fault.split('.'))}`} />
		</Localizer>
	) : (
		errorMessage(error)
	);
};

export default FaultError;
