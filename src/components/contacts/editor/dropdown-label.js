import { h, Component } from 'preact';
import { Select, Option } from '@zimbra/blocks';
import style from '../style';

import { I18nText } from './helper';

export default class DropdownLabel extends Component {
	changeLabel = ({ value }) => {
		const { attribute, group } = this.props;
		this.props.onFieldLabelChange({
			newLabel: value,
			originalLabel: attribute,
			group
		});
	};
	render({ dropdownLabels, nonSuffixedAttribute, group }) {
		return (
			<label class={style.dropdownLabel}>
				<Select
					iconPosition="right"
					value={nonSuffixedAttribute}
					anchor="left"
					onChange={this.changeLabel}
				>
					{dropdownLabels.map(label => (
						<Option
							iconPosition="right"
							title={<I18nText attribute={label} dictionary={`dropdown.${group}`} />}
							value={label}
						/>
					))}
				</Select>
			</label>
		);
	}
}
