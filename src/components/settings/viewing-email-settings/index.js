import { h } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';

import cx from 'classnames';
import Select from '../../select';
import { MANUAL_REFRESH, AS_NEW_MAIL_ARRIVES } from '../../../constants/mail';
import { SEND_READ_RECEIPT } from '../../../constants/mailbox-metadata';
import style from '../style';

// Polling intervals in minutes.
const POLLING_INTERVALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

const SEND_READ_RECEIPT_OPTIONS = [
	{
		value: SEND_READ_RECEIPT.values.prompt,
		label: 'settings.viewingEmail.sendReadReceiptOptions.askMe'
	},
	{
		value: SEND_READ_RECEIPT.values.always,
		label: 'settings.viewingEmail.sendReadReceiptOptions.alwaysSend'
	},
	{
		value: SEND_READ_RECEIPT.values.never,
		label: 'settings.viewingEmail.sendReadReceiptOptions.neverSend'
	}
];

const AFTRE_MAILMOVE_OPTIONS = [
	{ value: 'adaptive', label: 'settings.viewingEmail.afterMovingMessageOption.back' },
	{ value: 'previous', label: 'settings.viewingEmail.afterMovingMessageOption.previous' },
	{ value: 'next', label: 'settings.viewingEmail.afterMovingMessageOption.next' }
];

const PREVIOUS_PANE_OPTIONS = [
	{ value: 'right', label: 'settings.viewingEmail.previewPaneOption.right' },
	{ value: 'bottom', label: 'settings.viewingEmail.previewPaneOption.bottom' },
	{ value: 'off', label: 'settings.viewingEmail.previewPaneOption.none' }
];

const MARK_AS_READ_OPTIONS = [
	{ value: '0', label: 'settings.viewingEmail.markAsReadOption.immediately' },
	{ value: '2', label: 'settings.viewingEmail.markAsReadOption.2seconds' },
	{ value: '5', label: 'settings.viewingEmail.markAsReadOption.5seconds' },
	{ value: '-1', label: 'settings.viewingEmail.markAsReadOption.never' }
];
const MESSAGE_LIST_DENSITY_OPTIONS = [
	{ value: 'slim', label: 'settings.viewingEmail.messageListDensityOption.slim' },
	{ value: 'regular', label: 'settings.viewingEmail.messageListDensityOption.regular' },
	{ value: 'relaxed', label: 'settings.viewingEmail.messageListDensityOption.relaxed' }
];
const CHECK_NEW_EMAIL_TIMER_OPTIONS = [
	{ value: MANUAL_REFRESH, label: 'settings.viewingEmail.checkForNewEmailTimerOption.manually' },
	{
		value: AS_NEW_MAIL_ARRIVES,
		label: 'settings.viewingEmail.checkForNewEmailTimerOption.asNewMailArrives'
	}
];

const createSelectOptions = options =>
	options.map(({ value, label }) => (
		<option value={value} key={value}>
			<Text id={label} />
		</option>
	));

export default function ViewingEmailSettings({ value, onFieldChange }) {
	return (
		<div>
			<div class={cx(style.sectionTitle, style.hideMdUp)}>
				<Text id="settings.viewingEmail.title" />
			</div>
			<div class={style.subsection}>
				<div class={style.subsectionTitle}>
					<Text id="settings.viewingEmail.messageListsSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<ul class={style.list}>
						<li>
							<label>
								<ChoiceInput
									onChange={onFieldChange('messageListsEnableConversations')}
									checked={value.messageListsEnableConversations}
								/>
								<Text id="settings.viewingEmail.enableConversationsLabel" />
							</label>
						</li>
						<li>
							<label>
								<ChoiceInput
									onChange={onFieldChange('messageListsShowSnippets')}
									checked={value.messageListsShowSnippets}
								/>
								<Text id="settings.viewingEmail.showSnippetsLabel" />
							</label>
						</li>
						<li>
							<label>
								<ChoiceInput
									onChange={onFieldChange('messageListsGroupByList')}
									checked={value.messageListsGroupByList}
								/>
								<Text id="settings.viewingEmail.groupByListLabel" />
							</label>
						</li>
					</ul>
				</div>
			</div>
			<div class={cx(style.subsection, style.hideXsDown, style.notYetImplemented)}>
				<div class={style.subsectionTitle}>
					<Text id="settings.viewingEmail.multitaskingSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<ul class={style.list}>
						<li>
							<label>
								<ChoiceInput
									type="radio"
									name="multitasking"
									value="tabs"
									onChange={onFieldChange('multitasking')}
									checked={value.multitasking === 'tabs'}
								/>
								<Text id="settings.viewingEmail.tabsLabel" />
							</label>
						</li>
						<li>
							<label>
								<ChoiceInput
									type="radio"
									name="multitasking"
									value="recent"
									onChange={onFieldChange('multitasking')}
									checked={value.multitasking === 'recent'}
								/>
								<Text id="settings.viewingEmail.recentLabel" />
							</label>
						</li>
					</ul>
				</div>
			</div>
			<div class={cx(style.subsection, style.hideXsDown)}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.viewingEmail.previewPaneSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<Select onChange={onFieldChange('previewPane')} value={value.previewPane} fullWidth>
						{createSelectOptions(PREVIOUS_PANE_OPTIONS)}
					</Select>
				</div>
			</div>
			<div class={cx(style.subsection, style.hideXsDown)}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.viewingEmail.messageListDensitySubsection" />
				</div>
				<div class={style.subsectionBody}>
					<Select
						onChange={onFieldChange('messageListDensity')}
						value={value.messageListDensity}
						fullWidth
					>
						{createSelectOptions(MESSAGE_LIST_DENSITY_OPTIONS)}
					</Select>
				</div>
			</div>
			<div class={style.subsection}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.viewingEmail.markAsReadSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<Select onChange={onFieldChange('markAsRead')} value={value.markAsRead} fullWidth>
						{createSelectOptions(MARK_AS_READ_OPTIONS)}
					</Select>
				</div>
			</div>
			<div class={style.subsection}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.viewingEmail.checkForNewEmailTimerSection" />
				</div>
				<div class={style.subsectionBody}>
					<Select
						onChange={onFieldChange('mailPollingInterval')}
						value={value.mailPollingInterval}
						fullWidth
					>
						{createSelectOptions(CHECK_NEW_EMAIL_TIMER_OPTIONS)}
						{POLLING_INTERVALS.map(interval => (
							<option value={interval * 60}>
								<Text
									id="settings.viewingEmail.checkForNewEmailTimerOption.incrementalTime"
									fields={{ interval }}
								/>
							</option>
						))}
					</Select>
				</div>
			</div>

			<div class={style.subsection}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.viewingEmail.sendReadReceiptSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<Select
						onChange={onFieldChange('sendReadReceipt')}
						value={value.sendReadReceipt}
						fullWidth
					>
						{createSelectOptions(SEND_READ_RECEIPT_OPTIONS)}
					</Select>
				</div>
			</div>
			<div class={cx(style.subsection, style.notYetImplemented)}>
				<div class={cx(style.subsectionTitle, style.forSelect)}>
					<Text id="settings.viewingEmail.afterMovingMessageSubsection" />
				</div>
				<div class={style.subsectionBody}>{createSelectOptions(AFTRE_MAILMOVE_OPTIONS)}</div>
			</div>
			<div class={cx(style.subsection, style.notYetImplemented)}>
				<div class={style.subsectionTitle}>
					<span class={style.hideXsDown}>
						<Text id="settings.viewingEmail.desktopNotificationsSubsection" />
					</span>
					<span class={style.hideMdUp}>
						<Text id="settings.viewingEmail.mobileNotificationsSubsection" />
					</span>
				</div>
				<div class={style.subsectionBody}>
					<label>
						<ChoiceInput
							onChange={onFieldChange('enableDesktopNotifications')}
							checked={value.enableDesktopNotifications}
						/>
						<span class={style.hideXsDown}>
							<Text id="settings.viewingEmail.desktopNotificationsLabel" />
						</span>
						<span class={style.hideSmUp}>
							<Text id="settings.viewingEmail.mobileNotificationsLabel" />
						</span>
					</label>
				</div>
			</div>
			<div class={cx(style.subsection, style.hideXsDown, style.notYetImplemented)}>
				<div class={style.subsectionTitle}>
					<Text id="settings.viewingEmail.mailVersionSubsection" />
				</div>
				<div class={style.subsectionBody}>
					<ul class={style.list}>
						<li>
							<label>
								<ChoiceInput
									type="radio"
									name="mailVersion"
									value="advanced"
									checked={value.mailVersion === 'advanced'}
									onChange={onFieldChange('mailVersion')}
								/>
								<strong>
									<Text id="settings.viewingEmail.fullFeatured" />
								</strong>
								<Text id="settings.viewingEmail.mailVersionAdvancedLabel" />
							</label>
						</li>
						<li>
							<label>
								<ChoiceInput
									type="radio"
									name="mailVersion"
									value="standard"
									checked={value.mailVersion === 'standard'}
									onChange={onFieldChange('mailVersion')}
								/>
								<strong>
									<Text id="settings.viewingEmail.mailVersionBasicLabel" />
								</strong>
							</label>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
