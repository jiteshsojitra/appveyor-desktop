import { clean } from '../helpers';
import { capitalizeFirstLetter } from '../../lib/util';
import { SEND_AS, SEND_ON_BEHALF, GRANTED } from '../../constants/rights';

/**
 * Print an array of rights
 * @param {String[]} rights     An array of constants from /constants/rights.js
 * @param {Object} template     Dictionary for translating strings.
 * @return {String}
 */
function printRights(rights, template) {
	let out = '';
	if (~rights.indexOf(SEND_AS)) {
		out += template[SEND_AS]; // 'Send As';
	}

	if (~rights.indexOf(SEND_ON_BEHALF)) {
		if (out.length) {
			out += ` ${template.and} `;
		}
		out += template[SEND_ON_BEHALF]; // `Send On Behalf Of`;
	}

	return out;
}

// NOTE: To be finished in PREAPPS-1973
export default function GrantedRights({
	rights,
	owner,
	grantee,
	template,
	grantedOrRevoked = GRANTED
}) {
	rights = printRights(rights, template);

	// {{owner}} has granted {{rights}} to {{grantee}}
	// {{owner}} has revoked {{rights}} from {{grantee}}
	const header = template.header[grantedOrRevoked]
		.replace(/{{owner}}/, owner)
		.replace(/{{rights}}/, rights)
		.replace(/{{grantee}}/, grantee);

	return clean(`
		<div>
			<h1 style="font-size:1.3em;">
				${header}
			</h1>
			<hr>
			<table style="color:#333;font-size:1em;" cellspacing="0" cellpadding="3" border="0">
				<tbody>
					<tr>
						<th align="right">${capitalizeFirstLetter(template[grantedOrRevoked])} ${template.rights}:</th>
						<td>${rights}</td>
					</tr>
					<tr>
						<th align="right">${template.owner}:</th>
						<td>${owner}</td>
					</tr>
					<tr>
						<th align="right">${template.grantee}:</th>
						<td>${grantee}</td>
					</tr>
				</tbody>
			</table>
		</div>
	`);
}
