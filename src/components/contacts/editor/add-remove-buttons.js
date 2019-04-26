import { h, Component } from 'preact';
import { Icon } from '@zimbra/blocks';
import style from '../style';

export default class AddRemoveButtons extends Component {
	deleteField = () => {
		const { attribute, group, onRemoveField } = this.props;
		onRemoveField({
			attribute,
			group
		});
	};

	addField = () => {
		const { attribute, defaultAttributeForNewField, group, onAddField } = this.props;
		onAddField({
			group,
			addAfterField: attribute,
			newFieldAttribute: defaultAttributeForNewField
		});
	};

	render({ showRemoveButton }) {
		return (
			<span class={style.addRemoveButtons}>
				<button type="button" onClick={this.addField}>
					<Icon name="plus" />
				</button>
				{showRemoveButton && (
					<button type="button" onClick={this.deleteField}>
						<Icon name="minus" />
					</button>
				)}
			</span>
		);
	}
}
