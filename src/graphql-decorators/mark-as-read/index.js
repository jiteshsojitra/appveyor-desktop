import { Component } from 'preact';
import { compose } from 'react-apollo';
import { withProps } from 'recompose';
import get from 'lodash/get';

import { hasFlag, FLAGS } from '../../lib/util';

import withActionMutation from '../with-action-mutation';
import { types as apiClientTypes } from '@zimbra/api-client';
import accountInfo from '../account-info';

const { ActionOps, ActionType } = apiClientTypes;
class MarkAsRead extends Component {
	markAsRead = props => {
		props.action({
			type: ActionType[props.type],
			ids: [props.item.id],
			op: ActionOps.read
		});
	};

	scheduleMarkAsRead = props => {
		const { item, markAsReadAfterSeconds, shouldNotBeMarkedAsRead } = props;
		if (!this.base) {
			return;
		}

		if (item && markAsReadAfterSeconds !== -1 && hasFlag(item, FLAGS.unread)) {
			this.timeout = setTimeout(
				() => {
					!shouldNotBeMarkedAsRead && this.markAsRead(props);
				},
				markAsReadAfterSeconds ? markAsReadAfterSeconds * 1000 : 0
			);
		}
	};

	componentDidMount() {
		this.scheduleMarkAsRead(this.props);
	}

	componentWillReceiveProps(nextProps) {
		const id = get(this.props, 'item.id');
		const nextId = get(nextProps, 'item.id');
		if (nextId && nextId !== id) {
			clearTimeout(this.timeout);
			this.scheduleMarkAsRead(nextProps);
		}
	}

	componentWillUnmount() {
		clearTimeout(this.timeout);
	}

	render({ children }) {
		return children[0] || null;
	}
}

export default compose(
	accountInfo(),
	withProps(({ account: { prefs } }) => ({
		markAsReadAfterSeconds: prefs.zimbraPrefMarkMsgRead
	})),
	withActionMutation()
)(MarkAsRead);
