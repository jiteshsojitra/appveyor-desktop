import { h } from 'preact';
import PropTypes from 'prop-types';
import { Text } from 'preact-i18n';
import style from './style.less';

const ErrorTooltip = ({ message }) => (
	<p class={style.error}>
		<Text id="dialogs.timeError.WORKING_HOURS_ERROR" fields={{ message }} />
	</p>
);

ErrorTooltip.propTypes = {
	message: PropTypes.string.isRequired
};

export default ErrorTooltip;
