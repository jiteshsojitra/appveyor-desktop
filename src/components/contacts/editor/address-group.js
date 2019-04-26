import { h, Component } from 'preact';
import { Select, Option } from '@zimbra/blocks';
import { Text, Localizer } from 'preact-i18n';
import cx from 'classnames';
import style from '../style';
import countries from '../../../countries.json';
import FIELD_MAPS from '.';

import { COUNTRY, ADDRESS_FIELDS } from './fields';

import { getAddressFieldPrefixAndSuffix } from './helper';

export default class AddressGroup extends Component {
	state = getAddressFieldPrefixAndSuffix(this.props.attribute);

	selectCountry = ({ value }) => {
		const { prefix, suffix } = this.state;

		this.props.onCountrySelect({
			selectedCountry: value,
			field: prefix + COUNTRY + suffix
		});
	};

	componentWillReceiveProps(props) {
		const { prefix, suffix } = getAddressFieldPrefixAndSuffix(props.attribute);
		this.setState({
			prefix,
			suffix
		});
	}

	render({ pfx, contact, createContactFieldUpdater, readonly }, { prefix, suffix }) {
		return (
			<div class={style.addressGroup}>
				{ADDRESS_FIELDS.map(field => {
					const FieldComponent = FIELD_MAPS[field] || 'input';
					const fieldKey = prefix + field + suffix;
					return readonly ? (
						<span class={style.readonlyValue}>{contact.attributes[field]}</span>
					) : field === COUNTRY ? (
						<div class={cx(style.inputWrap, style.inputDropdown)}>
							<Localizer>
								<Select
									iconPosition="right"
									anchor="left"
									displayValue={
										contact.attributes[fieldKey] || <Text id={'contacts.edit.fields.Country'} />
									}
									value={contact.attributes[fieldKey]}
									onChange={this.selectCountry}
								>
									{countries.map(country => (
										<Option iconPosition="right" title={country} value={country} />
									))}
								</Select>
							</Localizer>
						</div>
					) : (
						<div class={style.inputWrap}>
							<Localizer>
								<FieldComponent
									id={pfx + field}
									name={fieldKey}
									placeholder={<Text id={`contacts.edit.fields.${field}`} />}
									value={contact.attributes[fieldKey] || ''}
									autocomplete={'off'}
									onInput={createContactFieldUpdater('attributes.' + fieldKey)}
								/>
							</Localizer>
						</div>
					);
				})}
			</div>
		);
	}
}
