import { h, Component } from 'preact';
import { Text, withText } from 'preact-i18n';
import moment from 'moment';
import styles from './style';

@withText({
	clockFormat: 'timeFormats.defaultFormat'
})
@withText(({ clockFormat }) => {
	const timeFormats = clockFormat === '12' ? 'timeFormats.format12hr' : 'timeFormats.format24hr';
	return {
		formatLT: `${timeFormats}.longDateFormat.LT`
	};
})
export default class SavedAt extends Component {
	render({ date, formatLT }) {
		return (
			date && (
				<span class={styles.saved}>
					<Text id="compose.saved" fields={{ time: moment(date).format(formatLT) }} />
				</span>
			)
		);
	}
}
