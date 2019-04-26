import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import ClientLogo from '../client-logo';
import get from 'lodash-es/get';
import accountInfo from '../../graphql-decorators/account-info/normalized-identities';
import { toggle } from '../../store/about/actions';
import { ModalDialog } from '@zimbra/blocks';
import CloseButton from '../close-button';
import cx from 'classnames';
import style from './style.less';
import withMediaQuery from '../../enhancers/with-media-query/index';
import { minWidth, screenMd } from '../../constants/breakpoints';
@connect(state => ({
	visible: state.about.visible,
	isOffline: get(state, 'network.isOffline')
}))
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@accountInfo()
export default class AboutModal extends Component {
	onToggle = () => this.props.dispatch(toggle());

	getTitle = noVersion => {
		const intlKey = noVersion ? 'about.modal.title' : 'about.modal.titleWithVersion';

		if (typeof process.env.ELECTRON_ENV !== 'undefined') {
			return process.platform === 'win32'
				? `${intlKey}.windows`
				: process.platform === 'darwin'
				? `${intlKey}.mac`
				: `${intlKey}.other`;
		}

		return `${intlKey}.web`;
	};

	render({ isOffline, visible, accountInfoQuery }) {
		const html = require(`!!svg-inline-loader!../../../clients/${CLIENT}/assets/logo.svg`);
		const [ComponentClass, componentClassProps] = [ModalDialog, { autofocusChildIndex: 1 }];
		const versionInfo = (get(accountInfoQuery, 'accountInfo.version') || '').split(' ');
		const buildInfo = {
			version: PKG_VERSION,
			hash: BUILD_COMMIT_HASH,
			timestamp: BUILD_TIMESTAMP
		};

		return (
			visible && (
				<ComponentClass {...componentClassProps} onClickOutside={this.onToggle}>
					<div class={style.inner}>
						<div class={cx(style.header)}>
							{typeof html === 'string' ? (
								<ClientLogo class={style.logo} />
							) : (
								<Text id={this.getTitle(true)} />
							)}
							<CloseButton onClick={this.onToggle} class={style.close} />
						</div>
						<div class={style.contentWrapper}>
							<div class={style.build}>
								<div class={style.version}>
									{typeof html === 'string' ? (
										<Text id={this.getTitle()} fields={buildInfo} />
									) : (
										<Text id="about.modal.version" fields={buildInfo} />
									)}
								</div>
								{versionInfo && versionInfo.length && (
									<div>
										<Text
											id="about.modal.serverVersion"
											fields={{
												version: versionInfo[0],
												build: versionInfo[1]
											}}
										/>
									</div>
								)}
								<div>
									{isOffline ? (
										<Text id="about.modal.isOffline" />
									) : (
										<Text id="about.modal.isOnline" />
									)}
								</div>
							</div>
							<div class={style.copyright}>
								<Text id="about.modal.copyright" />

								<div class={style.signature}>
									<div>
										<Text id="about.modal.signature.corp" />
									</div>
									<div>
										<Text id="about.modal.signature.link" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</ComponentClass>
			)
		);
	}
}
