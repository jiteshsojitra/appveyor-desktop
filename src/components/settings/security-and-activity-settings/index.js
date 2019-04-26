import { h } from 'preact';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import Select from '../../select';
import style from '../style';
import ZimletSlot from '../../zimlet-slot';

export default function SecurityAndActivitySettings({ value, onFieldChange }) {
	return (
		<div>
			<div class={cx(style.sectionTitle, style.hideMdUp)}>
				<Text id="settings.securityAndActivity.title" />
			</div>
			<div class={style.subsection}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.securityAndActivity.showImagesSubsection">Show images in emails</Text>
				</div>
				<div class={style.subsectionBody}>
					<Select onChange={onFieldChange('showImages')} value={value.showImages} fullWidth>
						<option value="false">
							<Text id="settings.securityAndActivity.showImagesOption.never" />
						</option>
						<option value="true">
							<Text id="settings.securityAndActivity.showImagesOption.always" />
						</option>
					</Select>
				</div>
			</div>
			<ZimletSlot name="user-sessions-management" />
		</div>
	);
}
