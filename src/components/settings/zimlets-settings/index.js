import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import { callWith } from '../../../lib/util';
import style from '../style';
import withAccountInfo from '../../../graphql-decorators/account-info';

@withAccountInfo()
export default class ZimletsSettings extends Component {
	handleZimletPrefChange = zimlet => {
		const zimletIndex = this.props.value.zimletPrefs.findIndex(
			selectedZimlet => selectedZimlet.name === zimlet.name
		);

		const modifiedZimlets = [
			...this.props.value.zimletPrefs.slice(0, zimletIndex),
			{
				name: zimlet.name,
				presence: zimlet.presence === 'disabled' ? 'enabled' : 'disabled',
				label: zimlet.label
			},
			...this.props.value.zimletPrefs.slice(zimletIndex + 1)
		];

		this.props.onFieldChange('zimletPrefs')({
			target: {
				value: modifiedZimlets
			}
		});
	};

	render({ value }) {
		const zimletList = value.zimletPrefs.map(zimlet => (
			<li>
				<label>
					<ChoiceInput
						checked={zimlet.presence === 'enabled' || zimlet.presence === 'mandatory'}
						disabled={zimlet.presence === 'mandatory'}
						onChange={callWith(this.handleZimletPrefChange, zimlet)}
					/>
					<span class={zimlet.presence === 'mandatory' && style.disabledText}>
						{zimlet.label || zimlet.name}
					</span>
				</label>
			</li>
		));

		return (
			<div>
				<div class={style.sectionTitle}>
					<Text id="settings.zimlets.mainTitle" />
				</div>
				<p>
					<Text id={`settings.zimlets.${zimletList.length ? 'helpText' : 'emptyListHelpText'}`} />
				</p>

				<ul class={style.zimletList}> {zimletList} </ul>
			</div>
		);
	}
}
