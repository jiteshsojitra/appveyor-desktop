import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import without from 'lodash-es/without';
import cx from 'classnames';
import { withAriaId } from '@zimbra/a11y';
import { isOfflineModeEnabled } from '../../../utils/offline';
import { WEBCLIENT_OFFLINE_BROWSER_KEY } from '../../../constants/offline';
import style from '../style';

const ENABLE = 'enable';
const DISABLE = 'disable';

/**
 * The offline mode setting is unique because it requires enabling on a per-browser basis.
 * The browser must have a common key with the server in order for offline mode to be enabled.
 */
@withAriaId('offlineModeSettings')
export default class OfflineModeSettings extends Component {
	state = {
		checked: isOfflineModeEnabled(this.props.value.offlineBrowserKey || '') ? ENABLE : DISABLE
	};

	handleEnable = () => {
		if (this.state.checked === ENABLE) {
			// Do nothing if already enabled.
			return;
		}
		this.setState({ checked: ENABLE });

		const { offlineBrowserKey } = this.props.value;
		let localOfflineBrowserKey = localStorage.getItem(WEBCLIENT_OFFLINE_BROWSER_KEY);

		if (!localOfflineBrowserKey) {
			localOfflineBrowserKey = Date.now().toString();
		}

		if (offlineBrowserKey && offlineBrowserKey.indexOf(localOfflineBrowserKey) !== -1) {
			// This offlineKey is already saved, do nothing
			return;
		}

		const value = !offlineBrowserKey
			? localOfflineBrowserKey
			: offlineBrowserKey
					.split(',')
					.concat(localOfflineBrowserKey)
					.join(',');

		this.props.onFieldChange('offlineBrowserKey')({
			target: {
				value
			}
		});
		this.props.setLocalBrowserKey({
			localOfflineBrowserKey
		});
	};

	handleDisable = () => {
		if (this.state.checked === DISABLE) {
			// Do nothing if already disabled.
			return;
		}
		this.setState({ checked: DISABLE });

		const { offlineBrowserKey } = this.props.value;
		const localOfflineBrowserKey = localStorage.getItem(WEBCLIENT_OFFLINE_BROWSER_KEY);

		if (!localOfflineBrowserKey) {
			// No way to disable if the local key doesn't exist
			return;
		}

		const value = !offlineBrowserKey
			? ''
			: without(offlineBrowserKey.split(','), localOfflineBrowserKey).join(',');

		this.props.onFieldChange('offlineBrowserKey')({
			target: {
				value
			}
		});
		this.props.setLocalBrowserKey({
			localOfflineBrowserKey: null
		});
	};

	render({ a11yId, ...props }, { checked }) {
		const enableInputId = `enable-${a11yId}`;
		const disableInputId = `disable-${a11yId}`;

		return (
			<div class={cx(style.offlineModeSection, props.class)}>
				<div class={cx(style.subsection, style.wrap)}>
					<div class={cx(style.sectionTitle)}>
						<Text id="settings.offlineMode.title" />
					</div>
					<Text id="settings.offlineMode.prompt" />
				</div>
				<div class={style.subsection}>
					<form>
						<div class={style.alignedRadioButton}>
							<span>
								<ChoiceInput
									type="radio"
									id={enableInputId}
									checked={checked === ENABLE}
									onClick={this.handleEnable}
									value={ENABLE}
								/>
							</span>
							<span>
								<div class={style.bold}>
									<label for={enableInputId}>
										<Text id="settings.offlineMode.radioButtons.enable.title" />
									</label>
								</div>

								<label for={enableInputId}>
									<Text id="settings.offlineMode.radioButtons.enable.prompt" />
								</label>
							</span>
						</div>

						<div class={style.alignedRadioButton}>
							<span>
								<ChoiceInput
									type="radio"
									id={disableInputId}
									checked={checked === DISABLE}
									onClick={this.handleDisable}
									value={DISABLE}
								/>
							</span>
							<span>
								<div class={style.bold}>
									<label for={disableInputId}>
										<Text id="settings.offlineMode.radioButtons.disable.title" />
									</label>
								</div>
								<label for={disableInputId}>
									<Text id="settings.offlineMode.radioButtons.disable.prompt" />
								</label>
							</span>
						</div>
					</form>
				</div>
			</div>
		);
	}
}
