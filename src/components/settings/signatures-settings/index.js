import { h } from 'preact';
import { Text } from 'preact-i18n';
import { callWith } from '../../../lib/util';
import { ChoiceInput } from '@zimbra/blocks';
import get from 'lodash-es/get';
import PureComponent from '../../../lib/pure-component';
import MiniComposer from '../../mini-composer';

import cx from 'classnames';
import Select from '../../select';
import style from '../style';

class SignaturesSettings extends PureComponent {
	triggerAccountChanged = e => {
		const index = get(e, 'nativeEvent.target.selectedIndex');

		this.setState({
			selectedAccountIndex: index
		});
		this.props.accountChangeEvent(this.props.accounts[index].id);
	};

	saveTempSignature = e => {
		this.props.updateAccountSettings(
			{
				defaultSignatureValue: e.value
			},
			this.props.accounts[this.state.selectedAccountIndex].id
		);
	};

	triggerUpdateAccountSettings = property => e => {
		if (e.target.type === 'checkbox') {
			this.props.updateAccountSettings(
				{ [property]: e.target.checked },
				this.props.accounts[this.state.selectedAccountIndex].id
			);
		} else {
			this.props.updateAccountSettings(
				{
					[property]: e.target.value
				},
				this.props.accounts[this.state.selectedAccountIndex].id
			);
		}
	};

	constructor(props) {
		super(props);

		this.state = {
			selectedAccountIndex: 0
		};
	}

	render({ accounts }, { selectedAccountIndex }) {
		return (
			<div>
				{accounts.length > 1 && (
					<div class={style.subsection}>
						<div class={cx(style.subsectionTitle, style.forSelect)}>
							<Text id="settings.signatures.account" />
						</div>
						<div class={style.subsectionBody}>
							<Select
								value={this.state.selectedAccountIndex}
								onChange={this.triggerAccountChanged}
								fullWidth
							>
								{accounts.map((account, index) => (
									<option value={index}>
										{(account.fromDisplay !== null ? account.fromDisplay : account.name) +
											' <' +
											account.emailAddress +
											'>'}
									</option>
								))}
							</Select>
						</div>
					</div>
				)}
				<div class={style.subsection}>
					<div class={style.subsectionTitle}>
						<Text id="settings.signatures.appendTitle" />
					</div>
					<div class={style.subsectionBody}>
						<ul class={style.list}>
							<li>
								<label>
									<ChoiceInput
										onChange={callWith(this.triggerUpdateAccountSettings, 'showSignatureEditor')()}
										checked={accounts[selectedAccountIndex].showSignatureEditor}
									/>
									<Text id="settings.signatures.append" />
								</label>
							</li>
							<li class={style.signatureBox}>
								{accounts[selectedAccountIndex].showSignatureEditor && (
									<MiniComposer
										message={accounts[selectedAccountIndex].defaultSignatureValue || ''}
										onChange={this.saveTempSignature}
										onInput={this.saveTempSignature}
									/>
								)}
							</li>
						</ul>
					</div>
				</div>
			</div>
		);
	}
}

export default SignaturesSettings;
