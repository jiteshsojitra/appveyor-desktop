import { h } from 'preact';
import { withText, Text } from 'preact-i18n';
import { compose } from 'recompose';
import { ChoiceInput } from '@zimbra/blocks';

import FormGroup from '../../../form-group';
import AlignedForm from '../../../aligned-form';
import AlignedLabel from '../../../aligned-form/label';
import TextInput from '../../../text-input';
import Select from '../../../select';
import ColorPicker from '../../../color-picker';

import style from './style.less';

const onFieldChange = (fieldName, state, cb) => ev => {
	cb({
		...state,
		[fieldName]:
			ev instanceof Event
				? ev.target.tagName === 'INPUT' && ev.target.type === 'checkbox'
					? !state[fieldName]
					: ev.target.value
				: ev
	});
};

function SharedCalendarInput({
	value,
	onChange,
	titlePlaceholder,
	ownerCalendarOptions,
	ownerEmailAddress
}) {
	return (
		<div>
			<TextInput
				value={value.name}
				onInput={onFieldChange('name', value, onChange)}
				class={style.titleInput}
				placeholder={titlePlaceholder}
			/>
			<AlignedForm>
				<FormGroup>
					<AlignedLabel width="70px" class={style.label}>
						<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_OWNER_LABEL" />
					</AlignedLabel>
					<span class={style.ownerEmailAddress}>{ownerEmailAddress}</span>
				</FormGroup>
				<FormGroup>
					<AlignedLabel width="70px" class={style.label}>
						<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_NAME_LABEL" />
					</AlignedLabel>
					<Select
						value={value.sharedItemId}
						onChange={onFieldChange('sharedItemId', value, onChange)}
						class={style.ownerTitleSelect}
					>
						{ownerCalendarOptions.map(opt => (
							<option key={opt.label} value={opt.value}>
								{opt.label}
							</option>
						))}
					</Select>
				</FormGroup>
				<FormGroup>
					<AlignedLabel width="70px" class={style.label}>
						<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_COLOR_LABEL" />
					</AlignedLabel>
					<ColorPicker onChange={onFieldChange('color', value, onChange)} value={value.color} />
				</FormGroup>
				<FormGroup class={style.remindFormGroup}>
					<AlignedLabel width="70px" class={style.label}>
						<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_REMIND_LABEL" />
					</AlignedLabel>
					<div>
						<FormGroup compact>
							<ChoiceInput
								checked={value.remindMail}
								onChange={onFieldChange('remindMail', value, onChange)}
								disabled
							/>
							<span class={style.remindLabel}>
								<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_REMIND_MAIL_LABEL" />
							</span>
						</FormGroup>
						<FormGroup compact>
							<ChoiceInput
								checked={value.reminder}
								onChange={onFieldChange('reminder', value, onChange)}
							/>
							<span class={style.remindLabel}>
								<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_REMIND_MOBILE_DESKTOP_LABEL" />
							</span>
						</FormGroup>
						<div class={style.remindDisclaimer}>
							<Text id="calendar.dialogs.newSharedCalendar.CALENDAR_REMIND_DISCLAIMER" />
						</div>
					</div>
				</FormGroup>
			</AlignedForm>
		</div>
	);
}

export default compose(
	withText({
		titlePlaceholder: 'calendar.dialogs.newSharedCalendar.CALENDAR_TITLE_PLACEHOLDER'
	})
)(SharedCalendarInput);
