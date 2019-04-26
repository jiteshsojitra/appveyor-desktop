import { h } from 'preact';
import { Text, withText } from 'preact-i18n';
import { connect } from 'preact-redux';
import moment from 'moment';
import { Button, ChoiceInput } from '@zimbra/blocks';
import DateInput from '../../date-input';
import Textarea from '../../textarea';
import AlignedForm from '../../aligned-form';
import AlignedLabel from '../../aligned-form/label';
import FormGroup from '../../form-group';
import style from '../style';
import cx from 'classnames';
import { notify } from '../../../store/notifications/actions';
import PureComponent from '../../../lib/pure-component';
import { withSendMessage } from '../../../graphql-decorators/send-message';
import accountInfo from '../../../graphql-decorators/account-info';
import Select from '../../select';
import { isLicenseActive } from '../../../utils/license';
import { withPropsOnChange } from 'recompose';

const SEND_STANDARD_EXTERNAL_REPLY = 'sendStandardExternalReply',
	SEND_EXTERNAL_REPLY = 'sendExternalReply',
	DONT_SEND_EXTERNAL_REPLY = 'dontSendExtenalReply';

@connect(
	null,
	{ notify }
)
@accountInfo(({ data: { accountInfo: account } }) => ({
	email: account.name,
	name: account.attrs.displayName,
	isEnterprise: isLicenseActive(account.license)
}))
@withText({
	sampleSent: 'settings.vacationResponse.sampleSent',
	vacationResponseSample: 'settings.vacationResponse.vacationResponseSample'
})
@withPropsOnChange(['value'], ({ value }) => {
	let selectedExternalReplyValue;
	const sendStandardExternal =
			!value.enableOutOfOfficeExternalReply && !value.outOfOfficeSuppressExternalReply,
		sendExternal = value.enableOutOfOfficeExternalReply && !value.outOfOfficeSuppressExternalReply,
		dontSendExtenal = value.outOfOfficeSuppressExternalReply;

	if (sendStandardExternal) {
		selectedExternalReplyValue = SEND_STANDARD_EXTERNAL_REPLY;
	} else if (sendExternal) {
		selectedExternalReplyValue = SEND_EXTERNAL_REPLY;
	} else if (dontSendExtenal) {
		selectedExternalReplyValue = DONT_SEND_EXTERNAL_REPLY;
	}

	return {
		selectedExternalReplyValue,
		sendExternal
	};
})
@withSendMessage()
export default class VacationResponseSettings extends PureComponent {
	updateOooReplyEnabled = () => {
		const toggledValue = !this.props.value.enableOutOfOfficeReply;
		this.props.onFieldChange(['enableOutOfOfficeReply', 'enableOutOfOfficeAlertOnLogin'])({
			target: { value: toggledValue }
		});
	};

	updateOooExternalSender = ({ target: { value: selectedValue } }) => {
		const { value, onFieldChange } = this.props;

		if (selectedValue === SEND_STANDARD_EXTERNAL_REPLY) {
			if (value.enableOutOfOfficeExternalReply && value.outOfOfficeSuppressExternalReply) {
				onFieldChange(['enableOutOfOfficeExternalReply', 'outOfOfficeSuppressExternalReply'])({
					target: { value: !value.enableOutOfOfficeExternalReply }
				});
			} else if (value.enableOutOfOfficeExternalReply) {
				onFieldChange('enableOutOfOfficeExternalReply')({
					target: { value: !value.enableOutOfOfficeExternalReply }
				});
			} else {
				onFieldChange('outOfOfficeSuppressExternalReply')({
					target: { value: !value.outOfOfficeSuppressExternalReply }
				});
			}
		} else if (selectedValue === SEND_EXTERNAL_REPLY) {
			if (value.outOfOfficeSuppressExternalReply) {
				onFieldChange(['enableOutOfOfficeExternalReply', 'outOfOfficeSuppressExternalReply'])([
					!value.enableOutOfOfficeExternalReply,
					!value.outOfOfficeSuppressExternalReply
				]);
			} else {
				onFieldChange('enableOutOfOfficeExternalReply')({
					target: { value: !value.enableOutOfOfficeExternalReply }
				});
			}
		} else {
			onFieldChange('outOfOfficeSuppressExternalReply')({
				target: { value: !value.outOfOfficeSuppressExternalReply }
			});
		}
	};

	handleSendMsg = () => {
		const { email, name, vacationResponseSample, value, sampleSent, sendMessage } = this.props;
		const message = {
			to: [
				{
					email,
					name
				}
			],
			subject: vacationResponseSample,
			text: value.outOfOfficeReply.trim()
		};
		sendMessage(message).then(() => {
			this.props.notify({
				message: sampleSent
			});
		});
	};

	handleExternalSendMsg = () => {
		const {
			email,
			name,
			vacationResponseSample,
			value,
			sampleSent,
			sendMessage,
			notify: notifyAction
		} = this.props;
		const message = {
			to: [
				{
					email,
					name
				}
			],
			subject: vacationResponseSample,
			text: value.outOfOfficeExternalReply.trim()
		};
		sendMessage(message).then(() => {
			notifyAction({
				message: sampleSent
			});
		});
	};

	handleFromOnDateChange = date => {
		const fromDate = moment(date);
		const untilDate = moment(this.props.value.defaultUntilDate);
		if (fromDate.isValid() && untilDate.isValid()) {
			if (moment(untilDate).isBefore(fromDate)) {
				this.props
					.onFieldChange('defaultFromDate')({
						target: { value: date }
					})
					.then(() => {
						this.props.onFieldChange('defaultUntilDate')({
							target: {
								value: moment(date)
									.endOf('day')
									.toDate()
							}
						});
					});
			} else {
				this.props.onFieldChange('defaultFromDate')({
					target: { value: date }
				});
			}
		}
	};

	handleUntilDateOnChange = date => {
		const untilDate = moment(date).endOf('day');
		const fromDate = moment(this.props.value.defaultFromDate);
		if (fromDate.isValid() && untilDate.isValid()) {
			if (moment(untilDate).isBefore(fromDate)) {
				this.props
					.onFieldChange('defaultUntilDate')({
						target: { value: untilDate.toDate() }
					})
					.then(() => {
						this.props.onFieldChange('defaultFromDate')({
							target: { value: date }
						});
					});
			} else {
				this.props.onFieldChange('defaultUntilDate')({
					target: { value: untilDate.toDate() }
				});
			}
		}
	};

	render({ value, onFieldChange, selectedExternalReplyValue, sendExternal }) {
		const { isEnterprise } = this.props;

		return (
			<div>
				<div class={cx(style.sectionTitle, style.hideMdUp)}>
					<Text id="settings.vacationResponse.title" />
				</div>
				<div class={style.subsection}>
					<div class={style.subsectionBody}>
						<ul class={style.list}>
							<li>
								<label>
									<ChoiceInput
										onChange={this.updateOooReplyEnabled}
										checked={value.enableOutOfOfficeReply}
									/>
									<Text id="settings.vacationResponse.enableOutOfOfficeReply" />
								</label>
							</li>
						</ul>
					</div>
				</div>
				<AlignedForm>
					<FormGroup compact>
						<AlignedLabel width="60px" textId="settings.vacationResponse.fromDate" />
						<DateInput
							onDateChange={this.handleFromOnDateChange}
							class={style.inlineField}
							dateValue={value.enableOutOfOfficeReply ? value.defaultFromDate : ''}
							disabled={!value.enableOutOfOfficeReply}
						/>
					</FormGroup>
					<FormGroup compact>
						<AlignedLabel width="60px" textId="settings.vacationResponse.untilDate" />
						<DateInput
							onDateChange={this.handleUntilDateOnChange}
							class={style.inlineField}
							dateValue={value.enableOutOfOfficeReply ? value.defaultUntilDate : ''}
							disabled={!value.enableOutOfOfficeReply}
						/>
					</FormGroup>
				</AlignedForm>
				<Textarea
					rows="5"
					wide
					class={style.vacationResponseTextArea}
					value={value.outOfOfficeReply}
					disabled={!value.enableOutOfOfficeReply}
					onChange={onFieldChange('outOfOfficeReply')}
				/>
				<Button
					class={style.buttonNoMargin}
					id="settings.vacationResponse.sendMeCopy"
					disabled={!value.enableOutOfOfficeReply}
					onClick={this.handleSendMsg}
				>
					<Text id="settings.vacationResponse.sendMeCopy" />
				</Button>
				{isEnterprise &&
					[
						<div class={cx(style.subsection, style.vactionSubField)}>
							<div class={cx(style.subsectionTitle, style.forSelect)}>
								<Text id="settings.vacationResponse.externalSendersSubsection" />
							</div>
							<div class={cx(style.subsectionBody, style.vactionInlineField)}>
								<Select
									onChange={this.updateOooExternalSender}
									value={selectedExternalReplyValue}
									disabled={!value.enableOutOfOfficeReply}
									fullWidth
								>
									<option value={SEND_STANDARD_EXTERNAL_REPLY}>
										<Text id="settings.vacationResponse.externalSendersOption.sendStandard" />
									</option>
									<option value={SEND_EXTERNAL_REPLY}>
										<Text id="settings.vacationResponse.externalSendersOption.sendExternal" />
									</option>
									<option value={DONT_SEND_EXTERNAL_REPLY}>
										<Text id="settings.vacationResponse.externalSendersOption.donotSend" />
									</option>
								</Select>
							</div>
						</div>,
						(value.outOfOfficeExternalReply || sendExternal) && (
							<div class={style.vacationExternalMessageArea}>
								<Textarea
									rows="5"
									wide
									class={style.vacationResponseTextArea}
									value={value.outOfOfficeExternalReply}
									disabled={!value.enableOutOfOfficeReply}
									onChange={onFieldChange('outOfOfficeExternalReply')}
								/>

								<Button
									class={style.buttonNoMargin}
									id="settings.vacationResponse.sendMeCopy"
									disabled={!value.enableOutOfOfficeReply}
									onClick={this.handleExternalSendMsg}
								>
									<Text id="settings.vacationResponse.sendMeCopy" />
								</Button>
							</div>
						)
					].filter(Boolean)}
			</div>
		);
	}
}
