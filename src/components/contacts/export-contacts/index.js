import { h, Component } from 'preact';
import ModalDialog from '../../modal-dialog';
import { withState, withProps, compose } from 'recompose';
import { Button, ChoiceInput } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import wire from 'wiretie';
import { absoluteUrl, pluck, callWith } from '../../../lib/util';
import style from './style';

/** @see https://github.com/Zimbra/zm-mailbox/blob/develop/store-conf/conf/contacts/zimbra-contact-fields.xml */
const FORMATS = [
	{
		label: 'Microsoft Outlook CSV',
		id: 'outlook-2003-csv',
		csvFormat: 'outlook-2003-csv',
		default: true
	},
	{
		label: 'Thunderbird/Netscape LDIF',
		id: 'thunderbird-csv',
		format: 'ldif'
	},
	{
		label: 'VCF',
		id: 'vcf',
		format: 'vcf'
	},
	{
		label: 'Zip file of multiple VCFs',
		id: 'vcf-zip',
		format: 'zip'
	},
	{
		label: 'Yahoo CSV',
		id: 'yahoo-csv',
		csvFormat: 'yahoo-csv'
	}
];

@compose(
	wire('zimbra', null, zimbra => ({
		getExportUrl: zimbra.contacts.getExportUrl
	})),
	withState('formatId', 'setFormat', pluck(FORMATS, 'default', true).id),
	withProps(({ getExportUrl, formatId }) => ({
		exportUrl: absoluteUrl(getExportUrl(pluck(FORMATS, 'id', formatId))) // exportUrl must be absolute to escape preact-router.
	}))
)
export default class ExportContacts extends Component {
	closeDialog = () => {
		const { onClose } = this.props;
		if (onClose) onClose();
	};

	render({ formatId, exportUrl, setFormat }) {
		return (
			<ModalDialog
				class={style.exportContacts}
				title="contacts.export.DIALOG_TITLE"
				buttons={
					<Button styleType="primary" brand="primary" href={exportUrl}>
						<Text id="contacts.export.EXPORT_BUTTON" />
					</Button>
				}
				onClose={this.closeDialog}
			>
				<p class={style.description}>
					<Text id="contacts.export.DESCRIPTION" />
				</p>

				{FORMATS.map(({ id, label }) => (
					<label class={style.option}>
						<ChoiceInput
							type="radio"
							name="contact_export_format"
							value={id}
							checked={id === formatId}
							onClick={callWith(setFormat, id)}
						/>
						<Text id={'contacts.export.formats.' + id}>{label}</Text>
					</label>
				))}
			</ModalDialog>
		);
	}
}
