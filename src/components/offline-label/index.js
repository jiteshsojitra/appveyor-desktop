import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import { Spinner } from '@zimbra/blocks';
import style from './style';
import { notify, clear } from '../../store/notifications/actions';

@connect(
	({ network }) => ({
		isOffline: network.isOffline,
		isSyncing: network.isSyncInProgress
	}),
	{ notify, clear }
)
export default class OfflineLabel extends Component {
	componentWillReceiveProps(nextProps) {
		if (nextProps.isOffline !== this.props.isOffline) {
			const { isOffline } = nextProps;
			this.props.notify({
				message: <Text id={isOffline ? 'app.connectionError' : 'app.reconnectMessage'} />,
				duration: 86400, // Increase duration of notification to make it persistant
				failure: isOffline,
				action: {
					label: <Text id="buttons.ok" />,
					fn: () => {
						this.props.clear();
					}
				}
			});
		}
	}

	render({ isOffline, isSyncing }, {}) {
		return (
			<div class={style.offline}>
				{isSyncing && <Spinner class={style.spinner} />}

				{isOffline && (
					<span class={style.text}>
						<Text id="app.offline" />
					</span>
				)}
			</div>
		);
	}
}
