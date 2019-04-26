import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { getCurrentUrl } from 'preact-router';

import { multitasking } from '../../constants/mailbox-metadata';

import { addTab } from '../../store/navigation/actions';
import { getMailboxMetadata } from '../../graphql-decorators/mailbox-metadata';

export default function registerTab(mapPropsToTab) {
	return BaseComponent => {
		@getMailboxMetadata()
		@connect(
			(state, props) => ({
				tabs: state.navigation.tabs,
				multitasking: props.mailboxMetadata[multitasking.name]
			}),
			{
				addTab
			}
		)
		class RegisterTab extends Component {
			register = props => {
				if (props.multitasking === multitasking.values.tabs || !props.multitasking) {
					const tab = mapPropsToTab(props);
					if (!tab) {
						return;
					}

					const isRegistered = props.tabs.map(t => t.url).indexOf(getCurrentUrl()) > -1;
					if (!isRegistered) {
						props.addTab({
							...tab,
							url: tab.url || getCurrentUrl()
						});
					}
				}
			};

			componentWillMount() {
				this.register(this.props);
			}

			componentWillReceiveProps(nextProps) {
				this.register(nextProps);
			}

			render() {
				return <BaseComponent {...this.props} />;
			}
		}

		return RegisterTab;
	};
}
