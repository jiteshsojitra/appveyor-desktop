import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import { Button } from '@zimbra/blocks';
import { absoluteUrl } from '../../../lib/util';
import Select from '../../select';
import style from '../style';
import { startAttachmentDownloadProcess } from '../../../lib/save-as';
import linkState from 'linkstate';
import get from 'lodash-es/get';

const DESCRIPTION_LIST = ['IMAP', 'CalDAV', 'CardDAV'];
const OPTION_LIST = [
	{ value: 'all', label: 'settings.accounts.mobileConfig.optionList.all' },
	{ value: 'dav', label: 'settings.accounts.mobileConfig.optionList.dav' },
	{ value: 'caldav', label: 'settings.accounts.mobileConfig.optionList.caldav' },
	{ value: 'carddav', label: 'settings.accounts.mobileConfig.optionList.carddav' },
	{ value: 'imap', label: 'settings.accounts.mobileConfig.optionList.imap' }
];
const MANUAL_URL_LIST = ['calendar', 'contacts'];
@connect(({ email = {} }) => ({
	accountName: get(email, 'account.name')
}))
class MobileConfig extends Component {
	state = {
		mobileConfigType: 'all'
	};

	handleDownload = () => {
		const { mobileConfigType } = this.state;
		const value = `/service/home/~/?fmt=mobileconfig&configType=${mobileConfigType}`;
		const uri = this.getURI(value);
		startAttachmentDownloadProcess(uri);
	};

	getURI = value => this.context.zimbraBatchClient.resolve(value);

	getManualLink = emailAddress => absoluteUrl(this.getURI(`/dav/${emailAddress}`));

	render({ accountName }, { mobileConfigType }) {
		const uriLink = this.getManualLink(accountName);
		return (
			<div class={style.mobileConfigSection}>
				<div class={style.sectionTitle}>
					<Text id="settings.accounts.mobileConfig.title" />
				</div>
				<div class={style.description}>
					<p>
						<Text id="settings.accounts.mobileConfig.description.text" />
						<ul>
							{DESCRIPTION_LIST.map(value => (
								<li>
									<Text id={`settings.accounts.mobileConfig.description.list.${value}`} />
								</li>
							))}
						</ul>
					</p>
				</div>
				<div class={style.optionText}>
					<p>
						<Text id="settings.accounts.mobileConfig.optionText" />
					</p>
					<div class={style.subsectionBody}>
						<Select
							fullWidth
							value={mobileConfigType}
							onChange={linkState(this, 'mobileConfigType', 'target.value')}
						>
							{OPTION_LIST.map(({ value, label }) => (
								<option value={value}>
									<Text id={label} />
								</option>
							))}
						</Select>
					</div>
				</div>
				<div class={style.manualLinks}>
					<p>
						<Text id="settings.accounts.mobileConfig.urlText" />
					</p>
					<ul>
						{MANUAL_URL_LIST.map(value => (
							<li>
								<Text
									id={`settings.accounts.mobileConfig.urlLink.${value}`}
									fields={{ uri: uriLink }}
								/>
							</li>
						))}
					</ul>
				</div>
				<div class={style.button}>
					<Button styleType="primary" brand="primary" onClick={this.handleDownload}>
						<Text id="buttons.download" />
					</Button>
				</div>
			</div>
		);
	}
}

export default MobileConfig;
