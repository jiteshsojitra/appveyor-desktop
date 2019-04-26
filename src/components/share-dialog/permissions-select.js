import { h } from 'preact';
import { Text } from 'preact-i18n';

import Select from '../select';

// (r)ead
// (w)rite
// (i)nsert
// (d)elete
// (a)dminister
// workflow action (x)
// view (p)rivate
// view (f)reebusy
// (c)reate subfolder

const INTERNAL_PERMISSIONS_OPTIONS = [
	'r',
	'rf',
	'rp',
	'rw',
	'rwidx',
	'rwidxp',
	'rwidxa',
	'rwidxap'
];

const EXTERNAL_PERMISSIONS_OPTIONS = ['r', 'rf', 'rp', 'rw', 'rwidx', 'rwidxp'];

const PermissionsSelect = ({ inline, granteeType = 'guest', ...rest }) => {
	const permissionsOptions =
		granteeType === 'usr' ? INTERNAL_PERMISSIONS_OPTIONS : EXTERNAL_PERMISSIONS_OPTIONS;

	return (
		<Select {...rest} noBorder>
			{permissionsOptions.map(k => (
				<option value={k} key={k}>
					{inline ? (
						<Text id={`calendar.dialogs.share.fields.permissionsInline.options.${k}`} />
					) : (
						<Text id={`calendar.dialogs.share.fields.permissions.options.${k}`} />
					)}
				</option>
			))}
		</Select>
	);
};

export default PermissionsSelect;
