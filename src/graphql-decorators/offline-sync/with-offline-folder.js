import { h, Component } from 'preact';
import { compose } from 'react-apollo';
import { connect } from 'preact-redux';
import { setSyncInProgress } from '../../store/network/actions';
import { CONTACTS_VIEW, MAIL_VIEW } from '../../constants/views';
import { primeMailboxCache } from './mail-sync-helper';
import { primeContactsCache } from './contact-sync-helper';

export default function withOfflineFolder({ folderName, folderType, numDays, shouldRefresh }) {
	return compose(
		connect(
			null,
			{ setSyncInProgress }
		),
		Child =>
			class WithOfflineFolder extends Component {
				syncPrimeFolderCache(type) {
					const { isOffline } = this.props;

					if (isOffline) return;

					if (typeof folderName === 'function') {
						folderName = folderName(this.props);
					}

					this.props.setSyncInProgress(true);

					let syncFunctionPromise;
					switch (type) {
						case MAIL_VIEW:
							syncFunctionPromise = primeMailboxCache(this.context, { folderName, numDays });
							break;
						case CONTACTS_VIEW:
							syncFunctionPromise = primeContactsCache(this.context, { folderName });
							break;
					}

					// TODO: Consider showing the offline sync indicator while downloading
					syncFunctionPromise.then(() => {
						this.props.setSyncInProgress(false);
					});
				}

				componentDidMount() {
					this.syncPrimeFolderCache(folderType);
				}

				componentWillReceiveProps(nextProps) {
					if (
						shouldRefresh &&
						typeof shouldRefresh === 'function' &&
						shouldRefresh(this.props, nextProps)
					) {
						this.syncPrimeFolderCache(folderType);
					}
				}

				render(props) {
					return <Child {...props} />;
				}
			}
	);
}
