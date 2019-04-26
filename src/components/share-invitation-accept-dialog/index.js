import { h } from 'preact';
import { Text } from 'preact-i18n';
import { ChoiceInput } from '@zimbra/blocks';
import TextInput from '../text-input';
import ResponsiveModal from '../responsive-modal';
import ModalDrawerToolbar from '../modal-drawer-toolbar';
import AlignedForm from '../aligned-form';
import AlignedLabel from '../aligned-form/label';
import FormGroup from '../form-group';
import ColorPicker from '../color-picker';
import withCreateMountpoint from '../../graphql-decorators/create-mountpoint';
import { withHandlers, withStateHandlers, compose } from 'recompose';
import { getShareAttribute } from '../../utils/mail-item';
import style from './style';
import cx from 'classnames';
import withTrashMessage from '../../graphql-decorators/trash-message';
import { USER_FOLDER_IDS } from '../../constants';

function prepareSaveError({ message }) {
	const [id, props] = /object with that name already exists/.test(message)
		? ['calendar.addCalendarModal.errors.alreadyExists']
		: /Fault error: invalid name/.test(message)
		? ['calendar.addCalendarModal.errors.invalidName']
		: [
				'calendar.addCalendarModal.errors.generic',
				{ fields: { error: message && message.replace(/GraphQL error: Fault error: /, '') } }
		  ];

	return <Text id={id} {...props} />;
}

const getFormData = message => ({
	name: getShareAttribute(message, 'link', 'name'),
	color: 1,
	remindMail: false,
	remindMobileDesktop: true,
	isSubmitting: false
});

export default compose(
	withStateHandlers(
		({ message }) => ({
			error: undefined,
			formData: getFormData(message)
		}),
		{
			onError: () => error => ({ error }),
			onChangeCalendarName: ({ formData }) => e => ({
				formData: { ...formData, name: e.target.value }
			}),
			onChangeColor: ({ formData }) => color => ({ formData: { ...formData, color } }),
			onChangeRemindMail: ({ formData }) => e => ({
				formData: { ...formData, remindMail: e.target.checked }
			}),
			onChangeRemindMobileDesktop: ({ formData }) => e => ({
				formData: { ...formData, remindMobileDesktop: e.target.checked }
			}),
			onToggleSubmit: ({ formData }) => () => ({
				formData: { ...formData, isSubmitting: !formData.isSubmitting }
			})
		}
	),
	withTrashMessage(),
	withCreateMountpoint(),
	withHandlers({
		onSave: ({
			createMountpoint,
			onToggleSubmit,
			onError,
			onCancel,
			message,
			formData,
			trashMessage
		}) => () => {
			onToggleSubmit();
			return createMountpoint({
				view: 'appointment',
				flags: '#',
				name: formData.name,
				color: formData.color,
				sharedItemId: getShareAttribute(message, 'link', 'id'),
				ownerZimbraId: getShareAttribute(message, 'grantor', 'id'),
				owner: getShareAttribute(message, 'grantor', 'email'),
				reminder: formData.remindMail || formData.remindMobileDesktop, // TODO: whats the difference? See discussion on PREAPPS-381
				parentFolderId: USER_FOLDER_IDS.ROOT
			})
				.then(data => trashMessage && trashMessage(message).then(() => data))
				.then(() => {
					onCancel();
					onToggleSubmit();
				})
				.catch(err => {
					onError(prepareSaveError(err));
					onToggleSubmit();
				});
		}
	})
)(ShareInvitationAcceptDialog);

function ShareInvitationAcceptDialog({
	error,
	formData,
	message,
	onChangeCalendarName,
	onChangeColor,
	onChangeRemindMail,
	onChangeRemindMobileDesktop,
	onSave,
	onCancel,
	...props
}) {
	const sharedCalendarOwner = getShareAttribute(message, 'grantor', 'email');
	const sharedCalendarName = getShareAttribute(message, 'link[name]', 'name');

	return (
		<ResponsiveModal
			{...props}
			drawerProps={{
				toolbar: (
					<ModalDrawerToolbar
						title="buttons.addCalendar"
						actionLabel="buttons.save"
						onAction={onSave}
						onClose={onCancel}
						disablePrimary={!formData.name}
						pending={formData.isSubmitting}
					/>
				)
			}}
			dialogProps={{
				disablePrimary: !formData.name,
				title: 'buttons.addCalendar',
				actionLabel: 'buttons.save',
				onAction: onSave
			}}
			onClickOutside={onCancel}
			pending={formData.isSubmitting}
			error={error}
			class={cx(style.modal, props.class)}
		>
			<AlignedForm class={style.form}>
				<FormGroup>
					<TextInput value={formData.name} onInput={onChangeCalendarName} />
				</FormGroup>

				<FormGroup>
					<AlignedLabel align="left" textId="calendar.dialogs.share.addressFieldOwner" />
					<b>{sharedCalendarOwner}</b>
				</FormGroup>

				<FormGroup>
					<AlignedLabel align="left" textId="calendar.title" />
					<b>{sharedCalendarName}</b>
				</FormGroup>

				<FormGroup>
					<AlignedLabel align="left" textId="calendar.dialogs.newCalendar.COLOR_LABEL" />
					<ColorPicker value={formData.color} onChange={onChangeColor} />
				</FormGroup>

				<FormGroup>
					<AlignedLabel
						class={style.top}
						align="left"
						textId="calendar.addCalendarModal.remind.remind"
					/>

					<ul>
						<li>
							<ChoiceInput
								name="remind.mail"
								onInput={onChangeRemindMail}
								checked={formData.remindMail}
								disabled // see discussion on PREAPPS-381
							/>
							<label for="remind.mail">
								<Text id="calendar.addCalendarModal.remind.mail" />
							</label>
						</li>

						<li>
							<ChoiceInput
								name="remind.mobileDesktop"
								onInput={onChangeRemindMobileDesktop}
								checked={formData.remindMobileDesktop}
							/>
							<label for="remind.mobileDesktop">
								<Text id="calendar.addCalendarModal.remind.mobileDesktop" />
							</label>
						</li>

						<li>
							<Text id="calendar.addCalendarModal.footnote" />
						</li>
					</ul>
				</FormGroup>
			</AlignedForm>
		</ResponsiveModal>
	);
}
