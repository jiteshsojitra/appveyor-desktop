import { h } from 'preact';
import { Select, Option } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import s from './style';

const DROPDOWN_OPTION = ['byDateRule', 'byWeekDayRule'];

export default function MonthYearDropdown({ fields, optionType, monthYearOption, onChange }) {
	return (
		<div class={s.monthYearOption}>
			<Select
				displayValue={
					<Text
						id={`calendar.dialogs.customRecurrence.repeatSection.${optionType}.${monthYearOption}`}
						fields={fields}
					/>
				}
				iconPosition="right"
				iconSize="sm"
				showTooltip={false}
				onChange={onChange}
				class={s.selectButton}
				dropdown
				toggleButtonClass={s.toggleButtonClass}
			>
				{DROPDOWN_OPTION.map(val => (
					<Option icon={null} class={s.dropdownOption} value={val} key={val}>
						<Text
							id={`calendar.dialogs.customRecurrence.repeatSection.${optionType}.${val}`}
							fields={fields}
						/>
					</Option>
				))}
			</Select>
		</div>
	);
}
