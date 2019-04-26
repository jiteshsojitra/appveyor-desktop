import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import { FixedDialog } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import { DEFAULT_NOTIFICATION_DURATION } from '../../constants/notifications';
import { getNotification } from '../../store/notifications/selectors';
import * as notificationActions from '../../store/notifications/actions';

import cx from 'classnames';
import s from './style.less';

@connect(
	state => ({
		notification: getNotification(state)
	}),
	dispatch => ({
		clear: () => dispatch(notificationActions.clear())
	})
)
export default class Notifications extends Component {
	handleActionClick = event => {
		event.stopPropagation();

		this.props.clear();
		this.props.notification.action.fn();
	};

	static propTypes = {
		clear: PropTypes.func.isRequired,
		duration: PropTypes.number.isRequired,
		notification: PropTypes.object
	};

	static defaultProps = {
		duration: DEFAULT_NOTIFICATION_DURATION
	};

	componentWillReceiveProps(nextProps) {
		if (nextProps.notification && nextProps.notification !== this.props.notification) {
			clearTimeout(this.timeout);
			const delay = (nextProps.notification.duration || nextProps.duration) * 1000;
			this.timeout = setTimeout(this.props.clear, delay);
		}
	}

	componentWillUnmount() {
		clearTimeout(this.timeout);
	}

	render({ notification, clear }) {
		return (
			notification && (
				<FixedDialog
					class={cx(s.notifications, notification.failure ? s.failure : s.success)}
					onClick={clear}
				>
					<div className={s.label}>{notification.message}</div>
					{notification.action && (
						<button className={s.undoButton} onClick={this.handleActionClick}>
							{notification.action.label}
						</button>
					)}
				</FixedDialog>
			)
		);
	}
}
