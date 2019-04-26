import { h } from 'preact';
import { Text } from 'preact-i18n';

import TextInput from '../../../text-input';
import FormGroup from '../../../form-group';

import style from './style.less';

export default function OwnerEmailInput({ value, onChange, providerName, onSubmit }) {
	return (
		<form onSubmit={onSubmit}>
			<FormGroup class={style.stretch} rows>
				<label class={style.label}>
					<Text
						id="calendar.dialogs.newSharedCalendar.EMAIL_INPUT_LABEL"
						fields={{ providerName }}
					/>
				</label>
				<TextInput value={value} onInput={onChange} wide autofocus />
			</FormGroup>
		</form>
	);
}
