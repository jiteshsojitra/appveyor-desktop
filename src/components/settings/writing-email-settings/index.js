import { h } from 'preact';
import { Text } from 'preact-i18n';
import { Button, ChoiceInput } from '@zimbra/blocks';
import cx from 'classnames';
import DelegatesList from './delegates';
import {
	FONT_FAMILY,
	FONT_SIZE,
	FONT_FAMILY_LABEL_TO_DISPLAY,
	FONT_SIZE_LABEL_TO_DISPLAY
} from '../../../constants/fonts';
import Select from '../../select';
import style from '../style';

const DELEGATE_SEND_SETTINGS_INPUT = [
	{ value: 'owner', label: 'settings.writingEmail.delegates.sendSettingsInput.owner' },
	{ value: 'sender', label: 'settings.writingEmail.delegates.sendSettingsInput.sender' },
	{ value: 'both', label: 'settings.writingEmail.delegates.sendSettingsInput.both' },
	{ value: 'none', label: 'settings.writingEmail.delegates.sendSettingsInput.none' }
];

const createChoiceIput = (inputs, onChange, prefValue) =>
	inputs.map(({ value, label }) => (
		<li>
			<label class={style.label}>
				<ChoiceInput type="radio" value={value} onChange={onChange} checked={prefValue === value} />
				<span class={style.labelText}>
					<Text id={label} />
				</span>
			</label>
		</li>
	));

export default function WritingEmailSettings({ value, onFieldChange }) {
	return (
		<div>
			<div class={cx(style.sectionTitle, style.hideMdUp)}>
				<Text id="settings.writingEmail.title" />
			</div>
			<div class={cx(style.subsection, style.notYetImplemented)}>
				<div class={style.subsectionTitle}>
					<Text id="settings.writingEmail.whenSendingMessageSubsection">When sending messages</Text>
				</div>
				<div class={style.subsectionBody}>
					<ul class={style.list}>
						<li>
							<label>
								<ChoiceInput
									onChange={onFieldChange('whenSendingMessageAddToContacts')}
									checked={value.whenSendingMessageAddToContacts}
								/>
								<Text id="settings.writingEmail.addToContactsLabel">
									Automatically add new recipients to Contacts
								</Text>
							</label>
						</li>
						<li>
							<label>
								<ChoiceInput
									onChange={onFieldChange('whenSendingMessageGenerateLinkPreviews')}
									checked={value.whenSendingMessageGenerateLinkPreviews}
								/>
								<Text id="settings.writingEmail.generateLinkPreview">
									Automatically generate a preview of links
								</Text>
							</label>
						</li>
					</ul>
				</div>
			</div>
			<div class={style.subsection}>
				<div class={style.subsectionTitle}>
					<Text id="settings.writingEmail.undoSendSubsection">Undo send</Text>
				</div>
				<div class={style.subsectionBody}>
					<label>
						<ChoiceInput
							checked={value.undoSendEnabled}
							onChange={onFieldChange('undoSendEnabled')}
						/>
						<Text id="settings.writingEmail.enableUndoSend" />
					</label>
				</div>
			</div>
			<div class={style.subsection}>
				<div class={style.subsectionTitle}>
					<Text id="settings.writingEmail.requestReadReceipt" />
				</div>
				<div class={style.subsectionBody}>
					<label>
						<ChoiceInput
							checked={value.requestReadReceipt}
							onChange={onFieldChange('requestReadReceipt')}
						/>
						<Text id="settings.writingEmail.enableRequestReadReceipt" />
					</label>
				</div>
			</div>
			<div class={cx(style.subsection, style.hideXsDown, style.notYetImplemented)}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.writingEmail.richTextFontSubsection">Default rich text font</Text>
				</div>
				<div class={style.subsectionBody}>
					<div class={style.half}>
						<Select
							value={value.defaultRichTextFont}
							onChange={onFieldChange('defaultRichTextFont')}
							fullWidth
						>
							{FONT_FAMILY.map(fontFamily => (
								<option value={fontFamily.value}>
									{FONT_FAMILY_LABEL_TO_DISPLAY[fontFamily.label]}
								</option>
							))}
						</Select>
					</div>
					<div class={style.half}>
						<Select
							value={value.defaultRichTextSize}
							onChange={onFieldChange('defaultRichTextSize')}
							fullWidth
						>
							{FONT_SIZE.map(fontSize => (
								<option value={fontSize.value}>{FONT_SIZE_LABEL_TO_DISPLAY[fontSize.label]}</option>
							))}
						</Select>
					</div>
					<div class={style.richTextPreview}>
						<Text id="settings.writingEmail.sample">Sample</Text>
					</div>
				</div>
			</div>
			<div class={cx(style.subsection, style.notYetImplemented)}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.writingEmail.defaultSendingAccountSubsection">
						Default sending account
					</Text>
				</div>
				<div class={style.subsectionBody}>
					<Select disabled>
						<option>
							<Text id="settings.writingEmail.primary" fields={{ email: 'john.doe@example.com' }} />
						</option>
					</Select>
				</div>
			</div>
			<div class={cx(style.subsection, style.notYetImplemented)}>
				<div class={style.subsectionTitle}>
					<Text id="settings.writingEmail.sendOnlyAddressSubsection">Add send only address</Text>
				</div>
				<div class={style.subsectionBody}>
					<div>
						<input type="text" class={style.textInput} disabled />
						<Button>
							<Text id="buttons.verify" />
						</Button>
					</div>
					<Text id="settings.writingEmail.editSignature">
						Note: To edit your signature, go to Accounts.
					</Text>
				</div>
			</div>
			<div class={style.subsection}>
				<div class={style.subsectionTitle}>
					<Text id="settings.writingEmail.delegates.delegates" />
				</div>
				<div class={style.subsectionBody}>
					<div>
						<DelegatesList />
					</div>
				</div>
			</div>
			<div class={style.subsection}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.writingEmail.delegates.sendSettingsSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<ul class={style.list}>
						{createChoiceIput(
							DELEGATE_SEND_SETTINGS_INPUT,
							onFieldChange('delegatedSendSaveTarget'),
							value.delegatedSendSaveTarget
						)}
					</ul>
				</div>
			</div>
		</div>
	);
}
